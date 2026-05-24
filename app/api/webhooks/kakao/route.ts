export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { channels } from '@/drizzle/schema/channels';
import { auditLogs } from '@/drizzle/schema/audit';

/**
 * KakaoTalk channel webhook receiver.
 *
 * URL pattern: /api/webhooks/kakao?org=<orgId>&channel=<channelId>
 *
 * Kakao posts JSON events here (incoming user messages, friend-add events,
 * etc.). The full event schema depends on the channel type (오픈빌더 챗봇
 * vs 채널 메시지 API); we accept any JSON body, log it for now, and queue
 * a follow-up to route into the inbox once the event shape is finalized
 * per the user's Kakao Dev Console app configuration.
 *
 * This handler is intentionally permissive on the inbound shape — it must
 * always return 200 OK quickly so Kakao doesn't disable the webhook on
 * delivery failures. Any heavy processing should happen async.
 */

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Some platforms (Kakao 오픈빌더, Meta) verify webhook URLs with a GET
  // challenge before activating. Echo the challenge back if present.
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

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // Some Kakao endpoints send form-encoded payloads; accept those silently.
    body = { _raw: await request.text().catch(() => '') };
  }

  if (!orgId || !channelId) {
    return NextResponse.json({ error: 'missing_org_or_channel' }, { status: 400 });
  }

  // Verify the channel exists + belongs to the org. Don't block on
  // unrecognized payloads — log them for diagnosis but ack 200 anyway.
  let known = false;
  try {
    const [row] = await db
      .select({ id: channels.id })
      .from(channels)
      .where(and(eq(channels.id, channelId), eq(channels.organizationId, orgId)))
      .limit(1);
    known = !!row;
  } catch {
    // DB unreachable — still ack so Kakao doesn't disable webhook.
    return NextResponse.json({ ok: true, note: 'db_unreachable' });
  }

  if (!known) {
    return NextResponse.json({ error: 'unknown_channel' }, { status: 404 });
  }

  // Touch lastSyncAt + persist the raw event in audit_logs.metadata for
  // post-hoc inspection. Real conversation/message routing wires into
  // lib/channels/router.ts (Phase 2) — adding the dispatcher here is the
  // immediate next task once we see a real Kakao event payload from the
  // user's account.
  try {
    await db
      .update(channels)
      .set({ lastSyncAt: new Date() })
      .where(eq(channels.id, channelId));

    await db.insert(auditLogs).values({
      organizationId: orgId,
      actorUserId: null,
      action: 'create',
      entityType: 'message',
      entityId: null,
      diff: { source: 'kakao_webhook' },
      metadata: { rawEvent: body },
    });
  } catch {
    // Silently swallow — we already promised to ack 200.
  }

  return NextResponse.json({ ok: true });
}
