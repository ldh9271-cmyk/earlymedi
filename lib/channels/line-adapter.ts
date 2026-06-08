import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { channels } from '@/drizzle/schema/channels';
import { conversations } from '@/drizzle/schema/conversations';
import { decryptPii } from '@/lib/encryption/pgcrypto';
import type {
  ChannelAdapter,
  ChannelKind,
  NormalizedInboundMessage,
  NormalizedOutboundMessage,
  SendResult,
} from './types';

/**
 * Real LINE Messaging API adapter.
 *
 * Sends agent replies back to a patient's LINE chat via the Push
 * Message endpoint (vs. Reply Message — Reply only works inside the
 * 30-second replyToken window from each inbound, which is far too
 * short for human concierge response times).
 *
 * Push messages count against your monthly LINE quota:
 *   - Free plan: 200 messages / month
 *   - Light: 5,000 / mo (₩5,500/mo as of 2025)
 *   - Standard: 30,000 / mo (₩16,500/mo)
 *   - Above quota → ¥3 per push (Japan), ~NT$0.75 / msg (Taiwan)
 *
 * Operator setup:
 *   1. developers.line.biz/console → Messaging API channel
 *   2. Copy Channel Access Token (long-lived). Channel Secret needed
 *      only for inbound webhook signature, not for Push.
 *   3. Paste into KoreaGlowUp > 채널 연결 > LINE > 연결하기.
 *
 * Failure modes:
 *   - Missing access token → agent gets a clear toast asking to
 *     re-enter the credential.
 *   - 401 → token revoked/rotated. Surfaces actionable message.
 *   - 403 → user blocked the OA (cannot push until they unblock).
 *   - 429 → over monthly free quota.
 *   - 4xx other → LINE's detail message bubbled up unchanged.
 */

const LINE_API_BASE = 'https://api.line.me/v2/bot';

type LineCredentials = {
  channelAccessToken?: string;
  channelSecret?: string;
};

export class LineAdapter implements ChannelAdapter {
  public readonly kind: ChannelKind = 'line';

  async send(msg: NormalizedOutboundMessage): Promise<SendResult> {
    // Resolve LINE credentials + the patient's LINE userId from the
    // conversation. contactExternalId stores the LINE userId that
    // came in via the webhook.
    const [row] = await db
      .select({
        channelId: channels.id,
        credentialsEncrypted: channels.credentialsEncrypted,
        contactExternalId: conversations.contactExternalId,
      })
      .from(conversations)
      .innerJoin(channels, eq(conversations.channelId, channels.id))
      .where(
        and(
          eq(conversations.id, msg.conversationId),
          eq(channels.kind, 'line'),
        ),
      )
      .limit(1);

    if (!row) {
      return { ok: false, error: 'channel_or_conversation_not_found' };
    }
    if (!row.contactExternalId) {
      return {
        ok: false,
        error:
          'LINE userId가 비어 있어 발신할 수 없습니다. 환자가 친구 추가 후 첫 메시지를 보내면 자동으로 채워집니다.',
      };
    }

    let creds: LineCredentials = {};
    if (row.credentialsEncrypted) {
      const plaintext = await decryptPii(row.credentialsEncrypted);
      if (plaintext) {
        try {
          creds = JSON.parse(plaintext) as LineCredentials;
        } catch {
          /* malformed — fall through */
        }
      }
    }
    if (!creds.channelAccessToken) {
      return {
        ok: false,
        error:
          'LINE Channel Access Token이 없습니다. 채널 연결 > LINE > 재연결에서 다시 입력해 주세요.',
      };
    }

    // LINE text messages cap at 5000 chars / message. We chunk above
    // that to multiple messages in a single push call (max 5 per
    // request, otherwise LINE rejects with 400). For now the
    // composer cap is well under, so we send a single message.
    const text = msg.body.length > 5000 ? msg.body.slice(0, 4997) + '…' : msg.body;

    try {
      const res = await fetch(`${LINE_API_BASE}/message/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${creds.channelAccessToken}`,
        },
        body: JSON.stringify({
          to: row.contactExternalId,
          messages: [{ type: 'text', text }],
        }),
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        return { ok: false, error: friendlyLineError(res.status, bodyText) };
      }

      // LINE returns 200 with empty body on success — no message id.
      // Fabricate one so downstream audit logs have something to
      // dedupe / reference.
      return {
        ok: true,
        externalMessageId: `line_push_${Date.now()}`,
        deliveredAt: new Date(),
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'unknown_line_error',
      };
    }
  }

  parseWebhook(
    _payload: unknown,
    _headers: Record<string, string>,
  ): NormalizedInboundMessage[] {
    // Inbound is handled by app/api/webhooks/line/route.ts — adapter
    // doesn't need to do anything here.
    return [];
  }
}

/**
 * Translate LINE's raw error responses into agent-readable Korean text.
 * Shown to the user as a toast in the inbox composer.
 *
 * LINE error reference:
 *   https://developers.line.biz/en/reference/messaging-api/#response-codes
 */
function friendlyLineError(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 401) {
    return 'Channel Access Token이 만료되었거나 잘못되었습니다. LINE Developers 콘솔에서 토큰을 재발급해 주세요.';
  }
  if (status === 403) {
    if (lower.includes('blocked')) {
      return '환자가 OA를 차단해 메시지를 받을 수 없습니다. 환자에게 차단 해제를 요청하거나 다른 채널로 연락해 주세요.';
    }
    return '권한이 부족합니다 (403). Messaging API 채널 권한과 plan을 확인해 주세요.';
  }
  if (status === 429) {
    return 'LINE 월간 무료 발송량을 초과했습니다. 유료 플랜으로 업그레이드하거나 다음 달까지 대기해 주세요.';
  }
  if (status === 400) {
    return `발송 실패 (400): ${body.slice(0, 200)}`;
  }
  if (status >= 500) {
    return 'LINE 서버 오류 — 잠시 후 자동 재시도됩니다.';
  }
  return `LINE 발송 실패 (HTTP ${status}): ${body.slice(0, 200)}`;
}
