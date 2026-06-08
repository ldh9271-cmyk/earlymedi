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
 * Real WhatsApp Business adapter (Meta Cloud API).
 *
 * Sends agent replies via:
 *   POST graph.facebook.com/v18.0/<PHONE_NUMBER_ID>/messages
 *   Authorization: Bearer <ACCESS_TOKEN>
 *
 * 24-hour customer service window:
 *   WhatsApp permits free-form `text` messages only when the patient
 *   has sent something within the last 24 hours. Outside that window
 *   only pre-approved template messages (HSM) are allowed. We:
 *     1. Look up the conversation's `lastInboundAt`.
 *     2. If null or > 24h ago, refuse to send + return a friendly
 *        error telling the agent why and what to do.
 *     3. Otherwise send a normal text message.
 *   Template support is intentionally deferred — most agencies wait
 *   for the patient to re-engage rather than burn a template send.
 *
 * Pricing (Meta charges per conversation, not per message):
 *   - Service conversations (patient initiated, within 24h): generally
 *     free for the first 1,000 / month, then a small per-conversation
 *     fee that varies by market (~$0.01–0.10).
 *   - Marketing / utility / authentication template messages: priced
 *     separately by category and country.
 *   We don't surface cost in the UI — operator monitors via Meta
 *   Business Manager > WhatsApp > Insights.
 */

const META_GRAPH_BASE = 'https://graph.facebook.com/v18.0';
// 24-hour customer service window in milliseconds.
const CS_WINDOW_MS = 24 * 60 * 60 * 1000;

type WhatsAppCredentials = {
  phoneNumberId?: string;
  accessToken?: string;
  wabaId?: string;
  verifyToken?: string;
  appSecret?: string;
};

export class WhatsAppAdapter implements ChannelAdapter {
  public readonly kind: ChannelKind = 'whatsapp';

  async send(msg: NormalizedOutboundMessage): Promise<SendResult> {
    // Pull conversation + channel + the most recent inbound timestamp
    // so we can enforce the 24h CS window without a second round-trip.
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
          eq(channels.kind, 'whatsapp'),
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
          'WhatsApp 전화번호(wa_id)가 비어 있어 발신할 수 없습니다. 환자가 첫 메시지를 보내면 자동으로 채워집니다.',
      };
    }

    let creds: WhatsAppCredentials = {};
    if (row.credentialsEncrypted) {
      const plaintext = await decryptPii(row.credentialsEncrypted);
      if (plaintext) {
        try {
          creds = JSON.parse(plaintext) as WhatsAppCredentials;
        } catch {
          /* malformed — fall through */
        }
      }
    }
    if (!creds.accessToken || !creds.phoneNumberId) {
      return {
        ok: false,
        error:
          'WhatsApp Access Token 또는 Phone Number ID가 없습니다. 채널 연결 > WhatsApp > 재연결에서 다시 입력해 주세요.',
      };
    }

    // Enforce the 24h customer service window. lastInboundAt is
    // updated by inbox-router on every inbound, so this is the
    // tightest possible signal. Fall back to scanning the latest
    // inbound message if the column is unexpectedly null (shouldn't
    // happen but defensive).
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
      lastInbound && Date.now() - lastInbound.getTime() < CS_WINDOW_MS;
    if (!insideWindow) {
      return {
        ok: false,
        error:
          '환자의 마지막 메시지로부터 24시간이 지나 자유 메시지 발송이 불가합니다. 환자가 먼저 새 메시지를 보내거나, 사전 승인된 템플릿(HSM) 발송이 필요합니다. (템플릿 발송 지원은 다음 업데이트 예정)',
      };
    }

    // WhatsApp text limit is 4096 chars. Past that, Meta returns 400.
    const text =
      msg.body.length > 4096 ? msg.body.slice(0, 4093) + '…' : msg.body;

    try {
      const res = await fetch(
        `${META_GRAPH_BASE}/${creds.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${creds.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: row.contactExternalId,
            type: 'text',
            text: {
              preview_url: false, // suppress link unfurls
              body: text,
            },
          }),
        },
      );

      const json = (await res.json().catch(() => ({}))) as {
        messages?: Array<{ id?: string }>;
        error?: { code?: number; message?: string; type?: string };
      };

      if (!res.ok || json.error) {
        return {
          ok: false,
          error: friendlyWhatsAppError(
            json.error?.code ?? res.status,
            json.error?.message ?? '',
          ),
        };
      }

      const messageId = json.messages?.[0]?.id;
      return {
        ok: true,
        externalMessageId: messageId ?? `wa_${Date.now()}`,
        deliveredAt: new Date(),
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'unknown_whatsapp_error',
      };
    }
  }

  parseWebhook(
    _payload: unknown,
    _headers: Record<string, string>,
  ): NormalizedInboundMessage[] {
    // Inbound handled by app/api/webhooks/whatsapp/route.ts.
    return [];
  }
}

/**
 * Meta Graph error code → Korean toast.
 *
 * Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
 */
function friendlyWhatsAppError(code: number, description: string): string {
  if (code === 190 || code === 401) {
    return 'WhatsApp Access Token이 만료되었거나 유효하지 않습니다. Meta Business Suite > 시스템 사용자 > 토큰 재발급 후 채널 연결을 갱신해 주세요.';
  }
  if (code === 100) {
    return `요청 형식 오류: ${description || '필드 누락'}`;
  }
  if (code === 131009) {
    return '받는 사람 번호 형식이 잘못되었습니다. E.164 형식 (국가코드 포함, + 없이) 인지 확인해 주세요.';
  }
  if (code === 131026) {
    return '환자가 메시지를 받을 수 없는 상태입니다 (수신 거부 또는 사업체 차단).';
  }
  if (code === 131047) {
    return '24시간 자유 메시지 윈도우 만료. 환자가 먼저 새 메시지를 보내거나 템플릿 메시지(HSM) 발송이 필요합니다.';
  }
  if (code === 131051) {
    return '메시지 타입을 처리할 수 없습니다. 텍스트만 지원됩니다.';
  }
  if (code === 80007 || code === 80008) {
    return 'Meta API 호출 한도를 초과했습니다. 잠시 후 자동 재시도됩니다.';
  }
  return `WhatsApp 발송 실패 (${code}): ${description || '알 수 없는 오류'}`;
}
