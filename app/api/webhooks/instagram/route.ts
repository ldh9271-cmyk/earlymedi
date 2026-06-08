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
 * Instagram DM (Meta Graph API) webhook.
 *
 * URL pattern: /api/webhooks/instagram?org=<orgId>&channel=<channelId>
 *
 * Operator setup (developers.facebook.com):
 *   1. Create / reuse a Meta app → add "Instagram" product.
 *      (For new apps: Use case "Other" → App type "Business".)
 *   2. Convert your Instagram account to a Business / Creator account,
 *      then connect it to a Facebook Page.
 *      (Settings → Account type → Switch to professional → Business.
 *       Then Facebook Page Settings → Linked Accounts → Instagram.)
 *   3. In the Meta app → Instagram → API Setup:
 *        - Generate / pick a Page Access Token with these scopes:
 *            instagram_basic, instagram_manage_messages,
 *            pages_manage_metadata, pages_messaging
 *        - Copy the Instagram Business Account ID (numeric).
 *   4. App Settings → Basic → copy App Secret.
 *   5. Make up a random verify token (16+ chars).
 *   6. Paste all 4 fields into KoreaGlowUp → 채널 연결 → Instagram →
 *      연결하기 → save.
 *   7. In Meta app → Instagram → Webhooks (or Webhooks product):
 *        - Callback URL: KoreaGlowUp 가 표시한 webhook URL
 *        - Verify token: 같은 값
 *        - Subscribe to the `messages` field on the Instagram object.
 *
 * Security:
 *   POST is signed with HMAC-SHA256 in `x-hub-signature-256`
 *   (`sha256=<hex>`). We require appSecret and reject any unsigned /
 *   mis-signed body with 401. The GET handshake constant-time-compares
 *   verify_token against the channel-scoped value.
 *
 * 24-hour customer messaging window:
 *   Free-form replies allowed only within 24h of patient's last
 *   inbound DM. Outside that window, message tags (MESSAGE_TAG
 *   messaging_type) are required — currently NOT implemented; the
 *   outbound adapter rejects with a friendly error past 24h.
 *
 * Payload note:
 *   Instagram uses the Messenger-style `entry[].messaging[]` shape
 *   (NOT the WhatsApp `entry[].changes[].value` shape). Sender id
 *   is the per-page Instagram-scoped Sender ID ("IGSID").
 */

type InstagramCredentials = {
  igBusinessAccountId?: string;
  pageAccessToken?: string;
  verifyToken?: string;
  appSecret?: string;
};

async function loadChannelSecrets(
  orgId: string,
  channelId: string,
): Promise<InstagramCredentials | null> {
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
        eq(channels.kind, 'instagram'),
      ),
    )
    .limit(1);
  if (!row) return null;
  if (!row.credentialsEncrypted) return {};
  const plaintext = await decryptPii(row.credentialsEncrypted);
  if (!plaintext) return {};
  try {
    return JSON.parse(plaintext) as InstagramCredentials;
  } catch {
    return {};
  }
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

/**
 * GET handshake. Meta sends:
 *   ?hub.mode=subscribe&hub.verify_token=<TOKEN>&hub.challenge=<RANDOM>
 * Echo challenge as plain text when token matches.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const orgId = url.searchParams.get('org');
  const channelId = url.searchParams.get('channel');

  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (!mode || !token || !challenge) {
    return NextResponse.json({ ok: true, service: 'koreaglowup-instagram-webhook' });
  }

  if (!orgId || !channelId) {
    return NextResponse.json({ error: 'missing_org_or_channel' }, { status: 400 });
  }
  if (mode !== 'subscribe') {
    return NextResponse.json({ error: 'unsupported_mode' }, { status: 403 });
  }

  const secrets = await loadChannelSecrets(orgId, channelId);
  if (!secrets?.verifyToken) {
    return NextResponse.json({ error: 'verify_token_not_configured' }, { status: 403 });
  }
  if (!constantTimeEqual(secrets.verifyToken, token)) {
    return NextResponse.json({ error: 'verify_token_mismatch' }, { status: 403 });
  }

  return new NextResponse(challenge, { status: 200 });
}

function verifySignature(
  appSecret: string,
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!appSecret || !signatureHeader) return false;
  const match = signatureHeader.match(/^sha256=([a-f0-9]+)$/i);
  const incomingHex = match?.[1];
  if (!incomingHex) return false;
  const expected = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex');
  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(incomingHex, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const orgId = url.searchParams.get('org');
  const channelId = url.searchParams.get('channel');

  if (!orgId || !channelId) {
    return NextResponse.json({ error: 'missing_org_or_channel' }, { status: 400 });
  }

  const rawBody = await request.text();
  const secrets = await loadChannelSecrets(orgId, channelId);
  if (!secrets) {
    return NextResponse.json({ error: 'unknown_channel' }, { status: 404 });
  }
  if (!secrets.appSecret) {
    return NextResponse.json({ error: 'app_secret_missing' }, { status: 401 });
  }
  const sigHeader = request.headers.get('x-hub-signature-256');
  if (!verifySignature(secrets.appSecret, rawBody, sigHeader)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let payload: InstagramWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as InstagramWebhookPayload;
  } catch {
    return NextResponse.json({ ok: true, note: 'unparseable_body' });
  }

  // The same webhook URL can also receive `page` (Messenger) events
  // when the Page is dual-subscribed. Filter to instagram only.
  if (payload.object !== 'instagram') {
    return NextResponse.json({ ok: true, note: 'non_instagram_payload' });
  }

  let processed = 0;
  let failed = 0;

  for (const entry of payload.entry ?? []) {
    // The IG Business Account ID owning this entry. Useful for
    // confirming the inbound is for the channel we expected.
    const igBusinessId = entry.id;
    for (const event of entry.messaging ?? []) {
      try {
        const parsed = parseInstagramEvent(event, igBusinessId);
        if (!parsed) continue;

        const detected = detectLocale(parsed.text);
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
            // Instagram doesn't expose country/locale on the messaging
            // event. Leave null and let inbox-router ratchet
            // contactLocale up via detectLocale on first long message.
          },
          body: parsed.text,
          bodyLocale,
          sentAt: parsed.sentAt,
          raw: event as unknown as Record<string, unknown>,
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
              source: 'instagram_webhook',
              routeError: err instanceof Error ? err.message : 'unknown',
            },
            metadata: { rawEvent: event },
          });
        } catch {
          /* swallow */
        }
      }
    }
  }

  return NextResponse.json({ ok: true, processed, failed });
}

// ─── Types & parsers ──────────────────────────────────────────────────

type InstagramWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    time?: number;
    messaging?: Array<Record<string, unknown>>;
  }>;
};

type ParsedInstagramMessage = {
  text: string;
  userId: string;       // IGSID — Instagram-Scoped User ID
  userName?: string;
  threadId: string;     // also IGSID (1:1 thread)
  messageId?: string;
  sentAt: Date;
};

/**
 * Extract a routable message from one entry.messaging[i] event.
 *
 * Routed:
 *   - regular DM text:        event.message.text
 *   - quick-reply tap:        event.message.quick_reply.payload (text)
 *   - story reply:            event.message.text + event.message.reply_to.story
 *                             (we route as plain text — the agent sees the
 *                              quoted story context only via raw.)
 *
 * Skipped (audit_log + return null):
 *   - message.attachments     (image/video/audio/file/share) — media
 *                              routing is a follow-up
 *   - reaction                (like/love etc on a previous message)
 *   - read receipts           (event.read)
 *   - delivery receipts       (event.delivery)
 *   - postback events         (button taps from message templates)
 *   - echoes                  (event.message.is_echo === true) —
 *                              these are our OWN outbound replies bouncing
 *                              back; routing them would duplicate the
 *                              composer message in the inbox.
 */
function parseInstagramEvent(
  event: Record<string, unknown>,
  _igBusinessId: string | undefined,
): ParsedInstagramMessage | null {
  const sender = event.sender as { id?: string } | undefined;
  if (!sender?.id) return null;

  const message = event.message as
    | {
        mid?: string;
        text?: string;
        is_echo?: boolean;
        quick_reply?: { payload?: string };
      }
    | undefined;
  if (!message) return null;

  // Skip our own outbound replies that Meta sends back.
  if (message.is_echo === true) return null;

  const text =
    (typeof message.text === 'string' && message.text) ||
    (typeof message.quick_reply?.payload === 'string' && message.quick_reply.payload) ||
    null;
  if (!text) return null;

  const ts =
    typeof event.timestamp === 'number' ? new Date(event.timestamp) : new Date();

  return {
    text,
    userId: sender.id,
    threadId: sender.id, // IG DM is 1:1; thread == IGSID
    messageId: typeof message.mid === 'string' ? message.mid : undefined,
    sentAt: ts,
  };
}
