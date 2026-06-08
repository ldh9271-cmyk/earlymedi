export const dynamic = 'force-dynamic';

import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { channels } from '@/drizzle/schema/channels';
import { auditLogs } from '@/drizzle/schema/audit';
import { decryptPii } from '@/lib/encryption/pgcrypto';
import { routeIncomingMessage } from '@/lib/channels/inbox-router';
import { detectLocale } from '@/lib/ai/translation';

/**
 * LINE Official Account webhook.
 *
 * URL pattern: /api/webhooks/line?org=<orgId>&channel=<channelId>
 *
 * Operator setup (developers.line.biz/console):
 *   1. Create / select a Messaging API channel.
 *   2. Copy the Channel Access Token (long-lived) and Channel Secret.
 *   3. Paste both into KoreaGlowUp > 채널 연결 > LINE > 연결하기.
 *   4. KoreaGlowUp saves them and returns this webhook URL.
 *   5. In the LINE console: Messaging API > Webhook settings → paste the
 *      URL → "Verify" should respond 200 → enable "Use webhook".
 *   6. Turn OFF "Auto-reply messages" in the LINE Official Account
 *      Manager (https://manager.line.biz/) — otherwise LINE answers
 *      with the default greeting before our agents can.
 *
 * Security:
 *   LINE signs each POST with `x-line-signature` = base64(HMAC-SHA256(
 *   channelSecret, raw_body)). We reject anything that doesn't verify;
 *   logging is silent because LINE may probe with garbage events.
 *
 * Failure-mode design:
 *   Always return 200 OK quickly so LINE doesn't disable the webhook
 *   on intermittent errors. Real diagnostics are appended to
 *   audit_logs (entity=message, action=create, source=line_webhook).
 *   The 5-second timeout is enforced upstream by LINE; if we approach
 *   it the inbox-router work can run async — but the current path
 *   completes well under 1s for typical loads.
 */

type LineCredentials = {
  channelAccessToken?: string;
  channelSecret?: string;
};

async function loadChannelSecrets(
  orgId: string,
  channelId: string,
): Promise<LineCredentials | null> {
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
        eq(channels.kind, 'line'),
      ),
    )
    .limit(1);
  if (!row) return null;
  if (!row.credentialsEncrypted) return {};
  const plaintext = await decryptPii(row.credentialsEncrypted);
  if (!plaintext) return {};
  try {
    return JSON.parse(plaintext) as LineCredentials;
  } catch {
    return {};
  }
}

/**
 * LINE signature check.
 *
 * Per https://developers.line.biz/en/reference/messaging-api/#signature-validation
 *   sig = base64( HMAC-SHA256(channelSecret, rawBody) )
 *   Compare to the `x-line-signature` header byte-for-byte (timingSafe).
 *
 * Returns false on any malformed input. Never throws.
 */
function verifySignature(
  channelSecret: string,
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!channelSecret || !signatureHeader) return false;
  const expected = crypto
    .createHmac('sha256', channelSecret)
    .update(rawBody, 'utf8')
    .digest('base64');
  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signatureHeader, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * GET — LINE doesn't strictly use a verification handshake (unlike
 * WeChat / Meta), but the LINE console's "Verify" button issues a POST
 * with an empty events array. Accept GET cheaply so operators visiting
 * the URL in a browser get a friendly OK.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true, service: 'koreaglowup-line-webhook' });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const orgId = url.searchParams.get('org');
  const channelId = url.searchParams.get('channel');

  if (!orgId || !channelId) {
    return NextResponse.json({ error: 'missing_org_or_channel' }, { status: 400 });
  }

  // Read the raw body ONCE — both signature verification and the
  // subsequent JSON parse must run on the same byte stream.
  const rawBody = await request.text();

  const secrets = await loadChannelSecrets(orgId, channelId);
  if (!secrets) {
    return NextResponse.json({ error: 'unknown_channel' }, { status: 404 });
  }

  // Verify signature. If the channel secret isn't configured yet
  // (operator saved the AccessToken but skipped the secret), reject
  // every POST — silent acceptance would let anyone post fake patient
  // messages into the inbox.
  if (!secrets.channelSecret) {
    return NextResponse.json({ error: 'channel_secret_missing' }, { status: 401 });
  }
  const sigHeader = request.headers.get('x-line-signature');
  if (!verifySignature(secrets.channelSecret, rawBody, sigHeader)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  // Parse the JSON envelope. LINE sends:
  //   { destination: "Uxxx", events: [ ... ] }
  // An empty events array is the "Verify" button's probe — ack OK.
  let payload: { destination?: string; events?: unknown[] };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true, note: 'unparseable_body' });
  }
  const events = Array.isArray(payload.events) ? payload.events : [];
  if (events.length === 0) {
    return NextResponse.json({ ok: true, note: 'empty_events' });
  }

  // Process each event sequentially. LINE typically batches related
  // events (e.g. follow + first message) and order matters for
  // conversation threading, so don't parallelize.
  let processed = 0;
  let failed = 0;
  for (const rawEvent of events) {
    try {
      const parsed = parseLineEvent(rawEvent);
      if (!parsed) continue; // skip unsupported event types silently

      const detected = detectLocale(parsed.text);
      // LINE is dominant in Japan/Taiwan/Thailand. countryCode left
      // null — the patient's nationality is unknown until they tell
      // us — but bodyLocale is inferred from content for the
      // translation pipeline.
      const bodyLocale = detected === 'other' ? undefined : detected;

      await routeIncomingMessage({
        organizationId: orgId,
        channelId,
        externalThreadId: parsed.threadId,
        externalMessageId: parsed.messageId,
        contact: {
          externalId: parsed.userId,
          displayName: parsed.userName,
          locale: bodyLocale,
          // Country defaults to JP (LINE's biggest market) but the
          // inbox-router auto-updates contactLocale whenever a new
          // inbound message arrives with a confidently-detected
          // language, so foreign LINE users won't stay mis-labeled.
          countryCode: 'JP',
        },
        body: parsed.text,
        bodyLocale,
        sentAt: parsed.sentAt,
        raw: rawEvent as Record<string, unknown>,
      });
      processed += 1;
    } catch (err) {
      failed += 1;
      try {
        await db.insert(auditLogs).values({
          organizationId: orgId,
          actorUserId: null,
          action: 'create',
          entityType: 'message',
          entityId: null,
          diff: {
            source: 'line_webhook',
            routeError: err instanceof Error ? err.message : 'unknown',
          },
          metadata: { rawEvent },
        });
      } catch {
        /* swallow */
      }
    }
  }

  return NextResponse.json({ ok: true, processed, failed });
}

type ParsedLineMessage = {
  text: string;
  userId: string;
  userName?: string;
  threadId: string;
  messageId?: string;
  sentAt: Date;
};

/**
 * Best-effort parser for the LINE event shapes we care about today.
 *
 * Supported:
 *   - type=message + message.type=text   → routed as a regular inbound
 *
 * Silently ignored (returns null):
 *   - message.type ∈ {image,video,audio,file,sticker,location} —
 *     non-text; future work to render via media fields. For now the
 *     agent just won't see them, which is preferable to crashing the
 *     webhook.
 *   - type ∈ {follow,unfollow,join,leave,memberJoined,memberLeft,
 *     postback,beacon,accountLink} — useful for lifecycle hooks later
 *     but irrelevant for first-pass message routing.
 *
 * Group/room events (source.type ≠ 'user') skipped too — KOIHA
 * clinics use 1:1 LINE chat, not group rooms.
 */
function parseLineEvent(raw: unknown): ParsedLineMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (e.type !== 'message') return null;

  const source = e.source as { type?: string; userId?: string } | undefined;
  if (!source?.userId || source.type !== 'user') return null;

  const message = e.message as { id?: string; type?: string; text?: string } | undefined;
  if (!message || message.type !== 'text' || !message.text) return null;

  const ts = typeof e.timestamp === 'number' ? new Date(e.timestamp) : new Date();
  return {
    text: String(message.text),
    userId: String(source.userId),
    threadId: String(source.userId), // 1:1 chat — thread == user
    messageId: message.id ? String(message.id) : undefined,
    sentAt: ts,
  };
}
