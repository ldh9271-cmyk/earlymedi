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
 * Real Naver 톡톡 (TalkTalk) adapter — Chatbot API.
 *
 * Sends via:
 *   POST https://gw.talk.naver.com/chatbot/v1/event
 *   Headers:
 *     Authorization: <authToken>   (no "Bearer" prefix — Naver convention)
 *     Content-Type: application/json
 *   Body:
 *     {
 *       "event": "send",
 *       "user": "<userId>",
 *       "textContent": { "text": "Hello" }
 *     }
 *
 * No 24-hour customer service window — Naver 톡톡 allows free-form
 * messaging as long as the user hasn't blocked the channel. This is a
 * meaningful advantage over WhatsApp / Instagram / Messenger for
 * follow-up communications.
 *
 * Costs:
 *   Naver 톡톡 standard messaging is free. Naver charges for
 *   premium features (broadcast, integration with 톡플 등) but
 *   1:1 agent replies cost nothing.
 *
 * Notes:
 *   - `gw.talk.naver.com` endpoint is the canonical Chatbot API.
 *     If Naver migrates the host, update META_TALKTALK_BASE below.
 *   - Rate limit specifics aren't published; treat 429 as transient
 *     and surface to the agent.
 */

const NAVER_TALKTALK_BASE = 'https://gw.talk.naver.com/chatbot/v1';

type NaverCredentials = {
  partnerId?: string;
  authToken?: string;
};

export class NaverAdapter implements ChannelAdapter {
  public readonly kind: ChannelKind = 'naver';

  async send(msg: NormalizedOutboundMessage): Promise<SendResult> {
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
          eq(channels.kind, 'naver'),
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
          'Naver 톡톡 user 식별자가 비어 있어 발신할 수 없습니다. 환자가 첫 메시지를 보내면 자동으로 채워집니다.',
      };
    }

    let creds: NaverCredentials = {};
    if (row.credentialsEncrypted) {
      const plaintext = await decryptPii(row.credentialsEncrypted);
      if (plaintext) {
        try {
          creds = JSON.parse(plaintext) as NaverCredentials;
        } catch {
          /* malformed — fall through */
        }
      }
    }
    if (!creds.authToken) {
      return {
        ok: false,
        error:
          'Naver 톡톡 인증 토큰이 없습니다. 채널 연결 > Naver 톡톡 > 재연결에서 다시 입력해 주세요.',
      };
    }

    // Naver TalkTalk text limit isn't published publicly; KakaoTalk/일반
    // 채팅 관례를 따라 2000자에서 자름. 실제로는 더 길어도 받아주는 듯
    // 하지만 안전 마진 둠.
    const text =
      msg.body.length > 2000 ? msg.body.slice(0, 1997) + '…' : msg.body;

    try {
      const res = await fetch(`${NAVER_TALKTALK_BASE}/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: creds.authToken,
        },
        body: JSON.stringify({
          event: 'send',
          user: row.contactExternalId,
          textContent: { text },
        }),
      });

      // Naver 응답이 200 + {success: true} 형태이거나 그냥 200 빈 body.
      // 둘 다 성공으로 인정.
      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        return { ok: false, error: friendlyNaverError(res.status, bodyText) };
      }

      // Try to parse success body, fall back to opaque ok.
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        resultCode?: string;
        resultMessage?: string;
      };
      if (json.success === false) {
        return {
          ok: false,
          error: friendlyNaverError(
            200,
            `${json.resultCode ?? 'unknown'}: ${json.resultMessage ?? ''}`,
          ),
        };
      }

      return {
        ok: true,
        externalMessageId: `naver_${Date.now()}`,
        deliveredAt: new Date(),
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'unknown_naver_error',
      };
    }
  }

  parseWebhook(
    _payload: unknown,
    _headers: Record<string, string>,
  ): NormalizedInboundMessage[] {
    // Inbound handled by app/api/webhooks/naver/route.ts.
    return [];
  }
}

/**
 * Naver 톡톡 응답 코드 → Korean toast.
 *
 * Naver 가 공식 에러 카탈로그를 폐쇄적으로 운영하므로 흔히 보이는
 * HTTP status + resultCode 패턴 위주로 매핑.
 */
function friendlyNaverError(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 401 || status === 403 || lower.includes('unauthorized')) {
    return 'Naver 톡톡 인증 토큰이 만료되었거나 잘못되었습니다. 톡톡 파트너 센터 > 챗봇 API 에서 토큰을 재발급해 주세요.';
  }
  if (status === 404) {
    return '사용자를 찾을 수 없습니다. 환자가 톡톡 차단을 해제했거나 챗봇 연결이 끊겼을 수 있습니다.';
  }
  if (lower.includes('block') || lower.includes('차단')) {
    return '환자가 톡톡 채널을 차단해 메시지를 받을 수 없습니다.';
  }
  if (status === 429 || lower.includes('rate') || lower.includes('limit')) {
    return 'Naver API 호출 한도를 초과했습니다. 잠시 후 자동 재시도됩니다.';
  }
  if (status >= 500) {
    return 'Naver 서버 오류 — 잠시 후 자동 재시도됩니다.';
  }
  return `Naver 톡톡 발송 실패 (HTTP ${status}): ${body.slice(0, 200)}`;
}
