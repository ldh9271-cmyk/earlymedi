export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { channels } from '@/drizzle/schema/channels';
import { auditLogs } from '@/drizzle/schema/audit';
import { decryptPii } from '@/lib/encryption/pgcrypto';
import { routeIncomingMessage } from '@/lib/channels/inbox-router';
import { detectLocale } from '@/lib/ai/translation';

/**
 * Naver 톡톡 (TalkTalk) Chatbot API webhook.
 *
 * URL pattern: /api/webhooks/naver?org=<orgId>&channel=<channelId>
 *
 * Operator setup (partner.talk.naver.com):
 *   1. 사업자 계정으로 Naver 톡톡 파트너 가입 → 사업자 인증 (1~2일).
 *   2. 새 톡톡 계정 생성 (검색에 노출되는 비즈니스 채널 이름).
 *   3. 설정 > 챗봇 API > 챗봇 활성화 → Partner ID + 인증 토큰 발급.
 *   4. KoreaGlowUp > 채널 연결 > Naver 톡톡 > 연결하기 → 두 값 입력 + 저장.
 *   5. 화면에 표시되는 Webhook URL 을 Naver 톡톡 파트너 센터의
 *      '챗봇 API 연결' 설정에 붙여넣기.
 *   6. 본인 휴대폰 Naver 앱에서 톡톡 계정 검색 → 메시지 보내기로 테스트.
 *
 * Security:
 *   Naver 톡톡 챗봇 API는 HMAC 서명을 제공하지 않습니다. 대신 두 가지
 *   보안 계층을 사용합니다:
 *     1. URL 의 channel UUID — 122 bits entropy (외부에서 추측 불가).
 *     2. Authorization 헤더 — Naver 가 webhook 호출 시 챗봇 등록 시
 *        설정한 auth token 을 헤더로 전송. 우리는 저장된 authToken
 *        과 byte 단위로 비교.
 *   authToken 미설정 시 보안 1차만 적용 (운영자 자율 — 미입력해도 동작).
 *
 * Webhook event 종류 (https://developers.naver.com/docs/talktalk):
 *   - open / leave / friend  → 사용자 채팅창 열기·닫기·친구
 *   - send                   → 사용자 메시지 (가장 중요, 인박스로 라우팅)
 *   - echo                   → 우리가 보낸 메시지의 반향 (skip)
 *   - pay_complete / confirm → 결제 이벤트 (다음 단계)
 *   - profile                → 사용자 프로필 (다음 단계)
 *   - handover               → 상담사 인계 (이미 KoreaGlowUp 가 상담자라 X)
 *
 * 답신 정책:
 *   Naver 톡톡은 24h customer service window 제약이 없습니다.
 *   사용자가 톡톡 차단을 하지 않는 한 언제든 발신 가능. (WhatsApp/Meta 의
 *   24h 제약 대비 큰 장점)
 */

type NaverCredentials = {
  partnerId?: string;
  authToken?: string;
};

async function loadChannelSecrets(
  orgId: string,
  channelId: string,
): Promise<NaverCredentials | null> {
  const [row] = await db
    .select({
      id: channels.id,
      kind: channels.kind,
      credentialsEncrypted: channels.credentialsEncrypted,
    })
    .from(channels)
    .where(
      and(
        eq(channels.id, channelId),
        eq(channels.organizationId, orgId),
        eq(channels.kind, 'naver'),
      ),
    )
    .limit(1);
  if (!row) return null;
  if (!row.credentialsEncrypted) return {};
  const plaintext = await decryptPii(row.credentialsEncrypted);
  if (!plaintext) return {};
  try {
    return JSON.parse(plaintext) as NaverCredentials;
  } catch {
    return {};
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true, service: 'koreaglowup-naver-talktalk-webhook' });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const orgId = url.searchParams.get('org');
  const channelId = url.searchParams.get('channel');

  if (!orgId || !channelId) {
    return NextResponse.json({ error: 'missing_org_or_channel' }, { status: 400 });
  }

  const secrets = await loadChannelSecrets(orgId, channelId);
  if (!secrets) {
    return NextResponse.json({ error: 'unknown_channel' }, { status: 404 });
  }

  // Optional auth header check. If authToken is configured, the
  // incoming Authorization header MUST match — anything else is a
  // forgery attempt. If authToken is NOT configured, fall through
  // and rely on the URL secret alone (channel UUID).
  if (secrets.authToken) {
    const incoming = request.headers.get('authorization');
    if (incoming !== secrets.authToken) {
      return NextResponse.json({ error: 'auth_mismatch' }, { status: 401 });
    }
  }

  let body: NaverWebhookPayload;
  try {
    body = (await request.json()) as NaverWebhookPayload;
  } catch {
    return NextResponse.json({ ok: true, note: 'unparseable_body' });
  }

  const event = body.event;
  // We only route `send` events into the inbox today. Other event
  // types (open, leave, friend, echo, pay_*, profile, handover) are
  // logged for visibility but skipped — they aren't messages.
  if (event !== 'send') {
    return NextResponse.json({ ok: true, note: `event_skipped:${event ?? 'unknown'}` });
  }

  try {
    const parsed = parseNaverSendEvent(body);
    if (!parsed) {
      try {
        await db.insert(auditLogs).values({
          organizationId: orgId,
          actorUserId: null,
          action: 'create',
          entityType: 'message',
          entityId: null,
          diff: { source: 'naver_webhook', parseFailed: true },
          metadata: { rawEvent: body as Record<string, unknown> },
        });
      } catch {
        /* swallow */
      }
      return NextResponse.json({ ok: true, note: 'no_text_extracted' });
    }

    const detected = detectLocale(parsed.text);
    const bodyLocale = detected === 'other' ? undefined : detected;

    await routeIncomingMessage({
      organizationId: orgId,
      channelId,
      externalThreadId: parsed.threadId,
      externalMessageId: parsed.messageId,
      contact: {
        externalId: parsed.userId,
        // Naver 톡톡 doesn't expose displayName on webhook payloads —
        // need a separate profile fetch which we skip for now.
        locale: bodyLocale,
        // Naver 톡톡 is Korea-centric — default to KR.
        countryCode: 'KR',
      },
      body: parsed.text,
      bodyLocale,
      sentAt: parsed.sentAt,
      raw: body as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    try {
      await db.insert(auditLogs).values({
        organizationId: orgId,
        actorUserId: null,
        action: 'create',
        entityType: 'message',
        entityId: null,
        diff: {
          source: 'naver_webhook',
          routeError: err instanceof Error ? err.message : 'unknown',
        },
        metadata: { rawEvent: body as Record<string, unknown> },
      });
    } catch {
      /* swallow */
    }
    return NextResponse.json({ ok: true, note: 'route_error_logged' });
  }
}

// ─── Types & parsers ──────────────────────────────────────────────────

type NaverWebhookPayload = {
  event?: string;
  user?: string;
  textContent?: { text?: string; inputType?: string };
  imageContent?: { imageUrl?: string };
  videoContent?: { videoUrl?: string };
  fileContent?: { fileUrl?: string; fileName?: string };
  options?: Record<string, unknown>;
  timestamp?: number;
  // Some payloads carry messageId / actionType on the root
  messageId?: string;
};

type ParsedNaverMessage = {
  text: string;
  userId: string;
  threadId: string;
  messageId?: string;
  sentAt: Date;
};

/**
 * Extract a routable message from a Naver TalkTalk `send` event.
 *
 * Routed:
 *   - textContent.text                  → 일반 텍스트
 *   - textContent (inputType=button)    → 사용자가 챗봇 버튼 탭한 결과
 *
 * Skipped (returns null, audit_log only):
 *   - imageContent / videoContent / fileContent — 미디어 라우팅은 다음 단계
 *   - 빈 user 필드
 *
 * Naver TalkTalk 의 `user` 값은 챗봇별로 unique 한 해시(예: 'al-Q3...').
 * 같은 사용자가 다른 챗봇에 메시지 보내면 다른 user 값이 발급되므로
 * conversation 의 externalThreadId 로 그대로 사용.
 */
function parseNaverSendEvent(body: NaverWebhookPayload): ParsedNaverMessage | null {
  const user = body.user;
  if (typeof user !== 'string' || !user) return null;

  const text = body.textContent?.text;
  if (typeof text !== 'string' || !text) return null;

  // Naver `timestamp` is ms unix; fall back to now if absent.
  const sentAt =
    typeof body.timestamp === 'number' ? new Date(body.timestamp) : new Date();

  return {
    text,
    userId: user,
    threadId: user, // 1:1 — thread = user
    messageId: typeof body.messageId === 'string' ? body.messageId : undefined,
    sentAt,
  };
}
