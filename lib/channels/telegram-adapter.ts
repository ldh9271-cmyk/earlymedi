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
 * Real Telegram Bot adapter.
 *
 * Sends agent replies back to a patient's Telegram chat via the
 * sendMessage Bot API endpoint. Free (Telegram has no per-message
 * pricing on bot messages — only rate limits: ~30 msg/sec global,
 * ~1 msg/sec to the same chat).
 *
 * Telegram's contactExternalId stores the user's numeric Telegram
 * `from.id`. We send to `conversations.externalThreadId` which holds
 * the chat id (same as user id for private chats; would differ for
 * group chats which we don't currently support).
 *
 * Failure modes (Telegram error_code):
 *   - 400 + 'chat not found' → user deleted the chat history.
 *   - 401 → bot token revoked. Operator must re-issue via @BotFather.
 *   - 403 → user blocked the bot. We can't push until they unblock.
 *   - 429 → flood control. Telegram includes `parameters.retry_after`
 *           in seconds — we surface that.
 */

const TELEGRAM_API_BASE = 'https://api.telegram.org';

type TelegramCredentials = {
  botToken?: string;
  webhookSecret?: string;
};

export class TelegramAdapter implements ChannelAdapter {
  public readonly kind: ChannelKind = 'telegram';

  async send(msg: NormalizedOutboundMessage): Promise<SendResult> {
    const [row] = await db
      .select({
        channelId: channels.id,
        credentialsEncrypted: channels.credentialsEncrypted,
        externalThreadId: conversations.externalThreadId,
      })
      .from(conversations)
      .innerJoin(channels, eq(conversations.channelId, channels.id))
      .where(
        and(
          eq(conversations.id, msg.conversationId),
          eq(channels.kind, 'telegram'),
        ),
      )
      .limit(1);

    if (!row) {
      return { ok: false, error: 'channel_or_conversation_not_found' };
    }
    if (!row.externalThreadId) {
      return {
        ok: false,
        error:
          'Telegram chat_id가 비어 있어 발신할 수 없습니다. 환자가 봇에게 /start를 보내면 자동으로 채워집니다.',
      };
    }

    let creds: TelegramCredentials = {};
    if (row.credentialsEncrypted) {
      const plaintext = await decryptPii(row.credentialsEncrypted);
      if (plaintext) {
        try {
          creds = JSON.parse(plaintext) as TelegramCredentials;
        } catch {
          /* malformed — fall through */
        }
      }
    }
    if (!creds.botToken) {
      return {
        ok: false,
        error:
          'Telegram Bot Token이 없습니다. 채널 연결 > Telegram > 재연결에서 다시 입력해 주세요.',
      };
    }

    // Telegram message text limit is 4096 UTF-16 code units. For
    // longer agent replies we chunk into multiple sendMessage calls;
    // for now the composer cap is well under, so a single call.
    const text =
      msg.body.length > 4096 ? msg.body.slice(0, 4093) + '…' : msg.body;

    try {
      const res = await fetch(
        `${TELEGRAM_API_BASE}/bot${creds.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: row.externalThreadId,
            text,
            // disable_web_page_preview helps when the agent pastes
            // a clinic URL — we don't want Telegram to render a
            // giant link preview that distracts from the text.
            disable_web_page_preview: true,
          }),
        },
      );

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        result?: { message_id?: number };
        error_code?: number;
        description?: string;
        parameters?: { retry_after?: number };
      };

      if (!res.ok || !json.ok) {
        return {
          ok: false,
          error: friendlyTelegramError(
            json.error_code ?? res.status,
            json.description ?? '',
          ),
          retryAfterMs: json.parameters?.retry_after
            ? json.parameters.retry_after * 1000
            : undefined,
        };
      }

      const messageId = json.result?.message_id;
      return {
        ok: true,
        externalMessageId: messageId
          ? `tg_${messageId}`
          : `tg_push_${Date.now()}`,
        deliveredAt: new Date(),
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'unknown_telegram_error',
      };
    }
  }

  parseWebhook(
    _payload: unknown,
    _headers: Record<string, string>,
  ): NormalizedInboundMessage[] {
    // Inbound is handled by app/api/webhooks/telegram/route.ts —
    // adapter doesn't need to do anything here.
    return [];
  }
}

/**
 * Telegram error mapper — turns Bot API failures into actionable
 * Korean messages for the agent's toast.
 *
 * Codes documented at https://core.telegram.org/bots/api#making-requests
 * (no canonical list — Telegram's description field is the source of
 * truth).
 */
function friendlyTelegramError(code: number, description: string): string {
  const lower = description.toLowerCase();
  if (code === 401) {
    return 'Bot Token이 잘못되었거나 만료되었습니다. @BotFather에서 /token으로 재발급해 주세요.';
  }
  if (code === 403) {
    if (lower.includes('blocked')) {
      return '환자가 봇을 차단해 메시지를 받을 수 없습니다. 다른 채널로 연락해 주세요.';
    }
    if (lower.includes('deactivated')) {
      return '환자 계정이 비활성화되었습니다.';
    }
    return `권한 거부 (403): ${description}`;
  }
  if (code === 400) {
    if (lower.includes('chat not found')) {
      return '채팅이 존재하지 않습니다. 환자가 봇에게 /start를 다시 보내야 할 수 있습니다.';
    }
    return `요청 오류 (400): ${description}`;
  }
  if (code === 429) {
    return 'Telegram 발송 속도 제한입니다. 잠시 후 자동 재시도됩니다.';
  }
  if (code >= 500) {
    return 'Telegram 서버 오류 — 잠시 후 자동 재시도됩니다.';
  }
  return `Telegram 발송 실패 (${code}): ${description || '알 수 없는 오류'}`;
}
