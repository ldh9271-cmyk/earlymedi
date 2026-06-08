import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { channels } from '@/drizzle/schema/channels';
import { conversations } from '@/drizzle/schema/conversations';
import { messages } from '@/drizzle/schema/messages';
import { decryptPii } from '@/lib/encryption/pgcrypto';
import type {
  ChannelAdapter,
  ChannelKind,
  NormalizedInboundMessage,
  NormalizedOutboundMessage,
  SendResult,
} from './types';

/**
 * Real Instagram DM adapter (Meta Graph API).
 *
 * Sends agent replies via:
 *   POST graph.facebook.com/v18.0/<IG_BUSINESS_ID>/messages
 *   Authorization: Bearer <PAGE_ACCESS_TOKEN>
 *   Body: { recipient: { id: <IGSID> }, message: { text } }
 *
 * 24-hour customer messaging window:
 *   Free-form text only within 24h of the patient's last DM. Outside
 *   that window Meta requires `messaging_type: "MESSAGE_TAG"` with a
 *   pre-approved tag (HUMAN_AGENT / ACCOUNT_UPDATE / etc.). Currently
 *   the adapter refuses to send past 24h with a friendly error.
 *   Tag support is a follow-up step.
 *
 * Rate limits (per app):
 *   - Standard apps: 200 calls/hour/user
 *   - Verified business apps: much higher (4800 calls/24h baseline,
 *     scales with active users)
 *   We don't pre-throttle in code — Meta returns 4-series errors
 *   that surface to the agent's toast.
 */

const META_GRAPH_BASE = 'https://graph.facebook.com/v18.0';
const CMW_WINDOW_MS = 24 * 60 * 60 * 1000;

type InstagramCredentials = {
  igBusinessAccountId?: string;
  pageAccessToken?: string;
  verifyToken?: string;
  appSecret?: string;
};

export class InstagramAdapter implements ChannelAdapter {
  public readonly kind: ChannelKind = 'instagram';

  async send(msg: NormalizedOutboundMessage): Promise<SendResult> {
    const [row] = await db
      .select({
        channelId: channels.id,
        credentialsEncrypted: channels.credentialsEncrypted,
        contactExternalId: conversations.contactExternalId,
        lastInboundAt: conversations.lastInboundAt,
      })
      .from(conversations)
      .innerJoin(channels, eq(conversations.channelId, channels.id))
      .where(
        and(
          eq(conversations.id, msg.conversationId),
          eq(channels.kind, 'instagram'),
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
          'Instagram IGSID 가 비어 있어 발신할 수 없습니다. 환자가 첫 DM 을 보내면 자동으로 채워집니다.',
      };
    }

    let creds: InstagramCredentials = {};
    if (row.credentialsEncrypted) {
      const plaintext = await decryptPii(row.credentialsEncrypted);
      if (plaintext) {
        try {
          creds = JSON.parse(plaintext) as InstagramCredentials;
        } catch {
          /* malformed — fall through */
        }
      }
    }
    if (!creds.pageAccessToken || !creds.igBusinessAccountId) {
      return {
        ok: false,
        error:
          'Instagram Page Access Token 또는 Business Account ID 가 없습니다. 채널 연결 > Instagram > 재연결에서 다시 입력해 주세요.',
      };
    }

    // 24h customer-messaging-window enforcement.
    let lastInbound: Date | null = row.lastInboundAt ?? null;
    if (!lastInbound) {
      const [latest] = await db
        .select({ sentAt: messages.sentAt })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, msg.conversationId),
            eq(messages.direction, 'inbound'),
          ),
        )
        .orderBy(sql`${messages.sentAt} desc`)
        .limit(1);
      lastInbound = latest?.sentAt ?? null;
    }
    const insideWindow =
      lastInbound && Date.now() - lastInbound.getTime() < CMW_WINDOW_MS;
    if (!insideWindow) {
      return {
        ok: false,
        error:
          '환자의 마지막 DM 으로부터 24시간이 지나 자유 메시지 발송이 불가합니다. 환자가 먼저 새 DM 을 보내거나, 사전 승인된 메시지 태그(MESSAGE_TAG) 발송이 필요합니다. (태그 발송 지원은 다음 업데이트 예정)',
      };
    }

    // Instagram DM text limit is 1000 chars (vs 4096 on WhatsApp/LINE).
    // We chunk longer messages by truncating with an ellipsis — the
    // agent rarely hits this in practice.
    const text =
      msg.body.length > 1000 ? msg.body.slice(0, 997) + '…' : msg.body;

    try {
      const res = await fetch(
        `${META_GRAPH_BASE}/${creds.igBusinessAccountId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${creds.pageAccessToken}`,
          },
          body: JSON.stringify({
            recipient: { id: row.contactExternalId },
            message: { text },
            // RESPONSE = standard messaging within 24h, which matches
            // our window-check above. The Graph API still defaults to
            // RESPONSE when omitted, but we set it explicitly so
            // future Tag support is a one-field swap.
            messaging_type: 'RESPONSE',
          }),
        },
      );

      const json = (await res.json().catch(() => ({}))) as {
        recipient_id?: string;
        message_id?: string;
        error?: { code?: number; message?: string; error_subcode?: number };
      };

      if (!res.ok || json.error) {
        return {
          ok: false,
          error: friendlyInstagramError(
            json.error?.code ?? res.status,
            json.error?.error_subcode,
            json.error?.message ?? '',
          ),
        };
      }

      return {
        ok: true,
        externalMessageId: json.message_id ?? `ig_${Date.now()}`,
        deliveredAt: new Date(),
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'unknown_instagram_error',
      };
    }
  }

  parseWebhook(
    _payload: unknown,
    _headers: Record<string, string>,
  ): NormalizedInboundMessage[] {
    // Inbound handled by app/api/webhooks/instagram/route.ts.
    return [];
  }
}

/**
 * Meta Graph error code → Korean toast.
 *
 * Reference: https://developers.facebook.com/docs/messenger-platform/error-codes
 * (Instagram DM uses the same Messenger error space.)
 */
function friendlyInstagramError(
  code: number,
  subcode: number | undefined,
  description: string,
): string {
  if (code === 190 || code === 401) {
    return 'Page Access Token 이 만료되었거나 잘못되었습니다. Meta for Developers > 본인 앱 > Instagram > API Setup 에서 토큰을 재발급해 주세요.';
  }
  if (code === 200 || subcode === 2018278) {
    return '권한이 부족합니다. instagram_manage_messages + pages_messaging 권한이 토큰에 포함되어 있는지 확인해 주세요.';
  }
  if (code === 100) {
    return `요청 형식 오류: ${description || '필드 누락'}`;
  }
  if (code === 551 || subcode === 1545041) {
    return '환자가 메시지를 받을 수 없습니다 (계정 비활성화 또는 사업체 차단).';
  }
  if (code === 10 || subcode === 2018108) {
    return '24시간 메시징 윈도우 만료. 환자가 먼저 새 DM 을 보내거나 메시지 태그(MESSAGE_TAG) 발송이 필요합니다.';
  }
  if (code === 4 || code === 17 || code === 32 || code === 613) {
    return 'Meta API 호출 한도를 초과했습니다. 잠시 후 자동 재시도됩니다.';
  }
  return `Instagram DM 발송 실패 (${code}${subcode ? '/' + subcode : ''}): ${description || '알 수 없는 오류'}`;
}
