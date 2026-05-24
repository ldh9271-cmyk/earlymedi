export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { channels } from '@/drizzle/schema/channels';
import { auditLogs } from '@/drizzle/schema/audit';
import { routeIncomingMessage } from '@/lib/channels/inbox-router';

/**
 * KakaoTalk channel webhook receiver.
 *
 * URL pattern: /api/webhooks/kakao?org=<orgId>&channel=<channelId>
 *
 * Kakao posts JSON events here. We parse a few common shapes (Kakao i
 * 오픈빌더 스킬 콜백, 카카오톡 채널 메시지 API, and our own /test simulator)
 * and route every parsed text message through the inbox-router so it
 * shows up in /agency/inbox immediately.
 *
 * Always returns 200 OK quickly so Kakao doesn't disable the webhook on
 * delivery failures — diagnostic info is persisted to audit_logs.
 */

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Webhook URL verification (Kakao 오픈빌더 / Meta-style hub.challenge).
  const url = new URL(request.url);
  const challenge = url.searchParams.get('hub.challenge') ?? url.searchParams.get('challenge');
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ ok: true, service: 'earlymedi-kakao-webhook' });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const orgId = url.searchParams.get('org');
  const channelId = url.searchParams.get('channel');

  if (!orgId || !channelId) {
    return NextResponse.json({ error: 'missing_org_or_channel' }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Form-encoded fallback
    const text = await request.text().catch(() => '');
    body = { _raw: text };
  }

  // Validate channel exists + belongs to org.
  let known = false;
  try {
    const [row] = await db
      .select({ id: channels.id })
      .from(channels)
      .where(and(eq(channels.id, channelId), eq(channels.organizationId, orgId)))
      .limit(1);
    known = !!row;
  } catch {
    return NextResponse.json({ ok: true, note: 'db_unreachable' });
  }
  if (!known) {
    return NextResponse.json({ error: 'unknown_channel' }, { status: 404 });
  }

  // Parse the payload into a normalized inbound message.
  const parsed = parseKakaoPayload(body);
  if (!parsed) {
    // Unknown shape — log it but still ack 200 so Kakao keeps the webhook alive.
    try {
      await db.insert(auditLogs).values({
        organizationId: orgId,
        actorUserId: null,
        action: 'create',
        entityType: 'message',
        entityId: null,
        diff: { source: 'kakao_webhook', parseFailed: true },
        metadata: { rawEvent: body },
      });
    } catch {
      /* swallow */
    }
    return NextResponse.json({ ok: true, note: 'payload_not_recognised' });
  }

  // Route into inbox
  try {
    const result = await routeIncomingMessage({
      organizationId: orgId,
      channelId,
      externalThreadId: parsed.threadId,
      externalMessageId: parsed.messageId,
      contact: {
        externalId: parsed.userId,
        displayName: parsed.userName,
        locale: 'ko',
        countryCode: 'KR',
      },
      body: parsed.text,
      bodyLocale: 'ko',
      sentAt: new Date(),
      raw: body,
    });

    return NextResponse.json({
      ok: true,
      conversationId: result.conversationId,
      messageId: result.messageId,
      isNewConversation: result.isNewConversation,
    });
  } catch (err) {
    // Log but still ack 200 so Kakao stays connected.
    try {
      await db.insert(auditLogs).values({
        organizationId: orgId,
        actorUserId: null,
        action: 'create',
        entityType: 'message',
        entityId: null,
        diff: {
          source: 'kakao_webhook',
          routeError: err instanceof Error ? err.message : 'unknown',
        },
        metadata: { rawEvent: body },
      });
    } catch {
      /* swallow */
    }
    return NextResponse.json({ ok: true, note: 'route_failed_logged' });
  }
}

type ParsedKakaoMessage = {
  text: string;
  userId: string;
  userName?: string;
  threadId: string;
  messageId?: string;
};

/**
 * Best-effort parser for the various Kakao webhook shapes:
 *
 *  - Kakao i 오픈빌더 스킬 webhook:
 *      { userRequest: { user: { id }, utterance, ... }, bot, action, ... }
 *  - Kakao 채널 메시지 API:
 *      { event: 'send_message', user_key, message: { text }, ... }
 *  - Our own /channels test simulator:
 *      { test: true, userId, text }
 */
function parseKakaoPayload(body: Record<string, unknown>): ParsedKakaoMessage | null {
  // Shape 1 — 오픈빌더 스킬
  const userRequest = body.userRequest as
    | { user?: { id?: string }; utterance?: string; block?: { id?: string } }
    | undefined;
  if (userRequest?.utterance && userRequest.user?.id) {
    return {
      text: String(userRequest.utterance),
      userId: String(userRequest.user.id),
      threadId: String(userRequest.user.id), // 1:1 chat — thread == user
    };
  }

  // Shape 2 — 채널 메시지 API
  const messageObj = body.message as { text?: string } | undefined;
  const userKey = body.user_key as string | undefined;
  if (messageObj?.text && userKey) {
    return {
      text: String(messageObj.text),
      userId: userKey,
      threadId: userKey,
    };
  }

  // Shape 3 — our test simulator
  if (body.test === true && typeof body.text === 'string' && typeof body.userId === 'string') {
    return {
      text: body.text,
      userId: body.userId,
      userName: typeof body.userName === 'string' ? body.userName : undefined,
      threadId: body.userId,
    };
  }

  return null;
}
