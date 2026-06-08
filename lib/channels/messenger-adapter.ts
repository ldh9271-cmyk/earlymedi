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
 * Real Facebook Messenger adapter (Meta Graph API).
 *
 * Sends via:
 *   POST graph.facebook.com/v18.0/me/messages?access_token=<TOKEN>
 *   Body: { recipient: { id: <PSID> }, message: { text },
 *           messaging_type: "RESPONSE" }
 *
 * 24-hour customer messaging window:
 *   Same policy as WhatsApp / Instagram. Free-form text only within
 *   24h of the patient's last inbound. Past that, Meta requires
 *   `messaging_type: "MESSAGE_TAG"` with one of the approved tags:
 *     - HUMAN_AGENT (7-day window for human-only response)
 *     - CONFIRMED_EVENT_UPDATE
 *     - POST_PURCHASE_UPDATE
 *     - ACCOUNT_UPDATE
 *   Currently rejected with a friendly error past 24h. Tag support
 *   is a follow-up.
 *
 * Note on /me/messages vs /<PAGE_ID>/messages:
 *   Both endpoints work with a Page Access Token. /me/messages is
 *   conventional and avoids hard-coding the page id into URL. We use
 *   it here for consistency.
 */

const META_GRAPH_BASE = 'https://graph.facebook.com/v18.0';
const CMW_WINDOW_MS = 24 * 60 * 60 * 1000;

type MessengerCredentials = {
  pageId?: string;
  pageAccessToken?: string;
  verifyToken?: string;
  appSecret?: string;
};

export class MessengerAdapter implements ChannelAdapter {
  public readonly kind: ChannelKind = 'messenger';

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
          eq(channels.kind, 'messenger'),
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
          'Messenger PSID 가 비어 있어 발신할 수 없습니다. 환자가 첫 메시지를 보내면 자동으로 채워집니다.',
      };
    }

    let creds: MessengerCredentials = {};
    if (row.credentialsEncrypted) {
      const plaintext = await decryptPii(row.credentialsEncrypted);
      if (plaintext) {
        try {
          creds = JSON.parse(plaintext) as MessengerCredentials;
        } catch {
          /* malformed — fall through */
        }
      }
    }
    if (!creds.pageAccessToken) {
      return {
        ok: false,
        error:
          'Messenger Page Access Token 이 없습니다. 채널 연결 > Facebook Messenger > 재연결에서 다시 입력해 주세요.',
      };
    }

    // 24h CMW enforcement.
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
          '환자의 마지막 메시지로부터 24시간이 지나 자유 메시지 발송이 불가합니다. 환자가 먼저 새 메시지를 보내거나, 사전 승인된 메시지 태그(MESSAGE_TAG) 발송이 필요합니다. (태그 발송 지원은 다음 업데이트 예정)',
      };
    }

    // Messenger text limit is 2000 chars. Truncate past that — agents
    // rarely hit this since composer caps reply length.
    const text =
      msg.body.length > 2000 ? msg.body.slice(0, 1997) + '…' : msg.body;

    try {
      const res = await fetch(
        `${META_GRAPH_BASE}/me/messages?access_token=${encodeURIComponent(creds.pageAccessToken)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: row.contactExternalId },
            message: { text },
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
          error: friendlyMessengerError(
            json.error?.code ?? res.status,
            json.error?.error_subcode,
            json.error?.message ?? '',
          ),
        };
      }

      return {
        ok: true,
        externalMessageId: json.message_id ?? `fb_${Date.now()}`,
        deliveredAt: new Date(),
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'unknown_messenger_error',
      };
    }
  }

  parseWebhook(
    _payload: unknown,
    _headers: Record<string, string>,
  ): NormalizedInboundMessage[] {
    // Inbound handled by app/api/webhooks/messenger/route.ts.
    return [];
  }
}

/**
 * Meta Graph error code → Korean toast. Shares the error space with
 * Instagram DM (both are Messenger Platform).
 *
 * Reference: https://developers.facebook.com/docs/messenger-platform/error-codes
 */
function friendlyMessengerError(
  code: number,
  subcode: number | undefined,
  description: string,
): string {
  if (code === 190 || code === 401) {
    return 'Page Access Token 이 만료되었거나 잘못되었습니다. Meta for Developers > Messenger > Settings 에서 토큰을 재발급해 주세요.';
  }
  if (code === 200 || subcode === 2018278) {
    return '권한이 부족합니다. pages_messaging + pages_messaging_subscriptions 권한이 토큰에 포함되어 있는지 확인해 주세요.';
  }
  if (code === 100) {
    return `요청 형식 오류: ${description || '필드 누락'}`;
  }
  if (code === 551 || subcode === 1545041) {
    return '환자가 메시지를 받을 수 없습니다 (계정 비활성화 또는 사업체 차단).';
  }
  if (code === 10 || subcode === 2018108 || subcode === 2018065) {
    return '24시간 메시징 윈도우 만료. 환자가 먼저 새 메시지를 보내거나 메시지 태그(MESSAGE_TAG) 발송이 필요합니다.';
  }
  if (code === 4 || code === 17 || code === 32 || code === 613) {
    return 'Meta API 호출 한도를 초과했습니다. 잠시 후 자동 재시도됩니다.';
  }
  return `Messenger 발송 실패 (${code}${subcode ? '/' + subcode : ''}): ${description || '알 수 없는 오류'}`;
}
