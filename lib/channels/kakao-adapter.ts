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
 * Real KakaoTalk adapter — calls the Kakao i 오픈빌더 Event API to push
 * an agent reply back into the user's channel chat. Replaces the
 * BaseMockAdapter for the 'kakao' kind so messages typed in
 * EarlyMedi's inbox actually reach the patient's KakaoTalk.
 *
 * Why EventAPI specifically:
 *   - Free (no per-message cost like 친구톡 / 알림톡)
 *   - No extra Kakao approval if the chatbot is already operating
 *   - Works within the 24-hour Customer Service window
 *
 * Setup requirements (operator side):
 *   1. In Kakao i 오픈빌더 시나리오, create an event block named
 *      `agent_reply` (or anything — set EVENT_NAME below to match).
 *      The block's bot response should be a Simple Text using
 *      `{{value.text}}` as the body. This is how the EventAPI payload
 *      flows to the user's chat.
 *   2. In i 오픈빌더 > 설정 > API 관리, generate an Event API key.
 *   3. In EarlyMedi > 채널 연결 > KakaoTalk > 재연결, paste the
 *      bot ID and the Event API key into the new credential fields.
 *
 * Failure handling:
 *   - Missing credentials → return ok:false with a helpful message
 *     surfaced to the agent as a toast. Message stays in DB so they
 *     can retry once credentials are in place.
 *   - Outside 24-hour window → Kakao rejects with a specific error
 *     code; we map to a friendlier message suggesting 친구톡 (paid).
 */

const KAKAO_BOT_API_BASE = 'https://bot-api.kakao.com';
const EVENT_NAME = 'agent_reply';

type KakaoCredentials = {
  restApiKey?: string;
  adminKey?: string;
  channelPublicId?: string;
  botId?: string;
  botEventApiKey?: string;
};

export class KakaoAdapter implements ChannelAdapter {
  public readonly kind: ChannelKind = 'kakao';

  async send(msg: NormalizedOutboundMessage): Promise<SendResult> {
    // 1. Look up the channel row to get encrypted credentials. We
    //    don't have organizationId in NormalizedOutboundMessage, so
    //    resolve via conversation → channel join.
    const [row] = await db
      .select({
        channelId: channels.id,
        credentialsEncrypted: channels.credentialsEncrypted,
        externalThreadId: conversations.externalThreadId,
        contactExternalId: conversations.contactExternalId,
      })
      .from(conversations)
      .innerJoin(channels, eq(conversations.channelId, channels.id))
      .where(
        and(
          eq(conversations.id, msg.conversationId),
          eq(channels.kind, 'kakao'),
        ),
      )
      .limit(1);

    if (!row) {
      return {
        ok: false,
        error: 'channel_or_conversation_not_found',
      };
    }

    // 2. Decrypt + parse credentials. botEventApiKey is the gate —
    //    without it we can't call the API.
    let creds: KakaoCredentials = {};
    if (row.credentialsEncrypted) {
      const plaintext = await decryptPii(row.credentialsEncrypted);
      if (plaintext) {
        try {
          creds = JSON.parse(plaintext) as KakaoCredentials;
        } catch {
          /* malformed credentials — fall through to error */
        }
      }
    }

    if (!creds.botId) {
      return {
        ok: false,
        error:
          '챗봇 ID 미설정 — 채널 연결에서 i 오픈빌더 봇 ID를 입력해 주세요.',
      };
    }
    if (!creds.botEventApiKey) {
      return {
        ok: false,
        error:
          'Event API Key 미설정 — i 오픈빌더 > 봇 설정 > API 관리에서 키를 발급해 채널 연결 폼에 입력해 주세요. (메시지는 인박스에 저장됨)',
      };
    }

    // 3. Build the EventAPI request. The user.id MUST be the
    //    botUserKey we captured during the inbound webhook
    //    (parsed.userId = userRequest.user.id in 오픈빌더 payload).
    //    We stored that as contactExternalId.
    const userKey = row.contactExternalId || msg.externalThreadId;
    if (!userKey) {
      return { ok: false, error: 'no_user_key' };
    }

    const url = `${KAKAO_BOT_API_BASE}/v2/bots/${encodeURIComponent(creds.botId)}/talk`;
    const payload = {
      user: { id: userKey, type: 'botUserKey' },
      event: {
        name: EVENT_NAME,
        data: { text: msg.body },
      },
    };

    // 4. Fire the request. Kakao responds within ~1s normally. We use
    //    a hard 10s timeout to avoid hanging the agent's UI on a flaky
    //    network.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `KakaoAK ${creds.botEventApiKey}`,
        },
        body: JSON.stringify(payload),
      });
      clearTimeout(timer);

      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        const friendly = friendlyKakaoError(res.status, bodyText);
        return { ok: false, error: friendly };
      }

      // EventAPI returns 200 with a JSON body. We don't get a real
      // message id back (the API just confirms the event was queued),
      // so synthesize one for our DB tracking.
      const syntheticId = `kakao_evt_${Date.now()}_${Math.floor(Math.random() * 1e6).toString(36)}`;
      return {
        ok: true,
        externalMessageId: syntheticId,
        deliveredAt: new Date(),
      };
    } catch (err) {
      clearTimeout(timer);
      const message =
        err instanceof Error
          ? err.name === 'AbortError'
            ? '카카오 응답 시간 초과 (10s) — 잠시 후 다시 시도해 주세요.'
            : err.message
          : 'unknown_kakao_error';
      return { ok: false, error: message };
    }
  }

  parseWebhook(
    _payload: unknown,
    _headers: Record<string, string>,
  ): NormalizedInboundMessage[] {
    // Inbound is handled by app/api/webhooks/kakao/route.ts — adapter
    // doesn't need to do anything here.
    return [];
  }
}

/**
 * Translate Kakao's raw error responses into agent-readable Korean
 * messages. Surfaced as toast text in the inbox composer.
 */
function friendlyKakaoError(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 401 || lower.includes('invalid_token') || lower.includes('unauthorized')) {
    return 'Event API Key가 잘못되었거나 만료되었습니다. i 오픈빌더에서 키를 재발급해 주세요.';
  }
  if (status === 404 || lower.includes('bot not found')) {
    return '챗봇 ID가 잘못되었거나 봇이 존재하지 않습니다.';
  }
  if (lower.includes('event') && lower.includes('not found')) {
    return (
      `시나리오에 "${EVENT_NAME}" 이벤트 블록이 없습니다. ` +
      'i 오픈빌더에서 같은 이름의 이벤트 블록을 만들고 응답으로 {{value.text}}를 사용해 주세요.'
    );
  }
  if (lower.includes('24h') || lower.includes('window') || lower.includes('expired')) {
    return (
      '사용자의 마지막 메시지 후 24시간이 지나 답변 윈도우가 만료됐습니다. ' +
      '친구톡(유료) 권한 신청이 필요합니다.'
    );
  }
  if (status === 429 || lower.includes('rate')) {
    return '카카오 호출 제한 초과. 잠시 후 다시 시도해 주세요.';
  }
  if (status >= 500) {
    return `카카오 서버 오류 (${status}). 잠시 후 다시 시도해 주세요.`;
  }
  return `카카오 발신 실패 (${status}): ${body.slice(0, 200)}`;
}
