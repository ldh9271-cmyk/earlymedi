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
 * Facebook Messenger (Meta Graph API) webhook.
 *
 * URL pattern: /api/webhooks/messenger?org=<orgId>&channel=<channelId>
 *
 * Operator setup (developers.facebook.com):
 *   1. Create / reuse a Meta app → add "Messenger" product.
 *   2. The clinic's Facebook Page must exist + the operator must be
 *      an admin of it. Convert to a Business page if it isn't already.
 *   3. In Meta app → Messenger → Settings:
 *        - "Generate Token" → select the connected Facebook Page →
 *          authorize the requested scopes →
 *          copy the resulting Page Access Token.
 *        - Required scopes: pages_messaging, pages_manage_metadata,
 *          pages_messaging_subscriptions, pages_read_engagement.
 *   4. Copy the Facebook Page ID — visible at the bottom of the
 *      page's "About" section, or via Meta Business Suite > Settings.
 *   5. App Settings → Basic → copy App Secret.
 *   6. Make up a random 16+ char verify token.
 *   7. Paste all 4 fields into KoreaGlowUp → 채널 연결 → Facebook
 *      Messenger → 연결하기 → save.
 *   8. In Meta app → Messenger → Settings → Webhooks:
 *        - Callback URL: KoreaGlowUp 가 표시한 webhook URL
 *        - Verify token: 같은 값
 *        - Subscribe the Page to the `messages` field (and
 *          optionally messaging_postbacks, messaging_optins).
 *
 * Security:
 *   POST signed with HMAC-SHA256 (`x-hub-signature-256: sha256=<hex>`).
 *   GET verifies hub.challenge with constant-time token compare.
 *   appSecret missing → 401 every POST.
 *
 * 24-hour customer messaging window:
 *   Same policy as WhatsApp / Instagram DM. Free-form text only
 *   within 24h of patient's last inbound. Outside that window, only
 *   pre-approved Message Tags (HUMAN_AGENT / CONFIRMED_EVENT_UPDATE /
 *   POST_PURCHASE_UPDATE / ACCOUNT_UPDATE) are allowed. Tag support
 *   is deferred to a follow-up — adapter currently rejects with a
 *   friendly error past 24h.
 *
 * Payload note:
 *   Messenger uses `entry[].messaging[]` (same shape as Instagram).
 *   Sender id is the per-Page-Scoped User ID ("PSID") which only
 *   makes sense in the context of that Page. Cross-page identity
 *   is intentionally not exposed.
 */

type MessengerCredentials = {
  pageId?: string;
  pageAccessToken?: string;
  verifyToken?: string;
  appSecret?: string;
};

async function loadChannelSecrets(
  orgId: string,
  channelId: string,
): Promise<MessengerCredentials | null> {
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
        eq(channels.kind, 'messenger'),
      ),
    )
    .limit(1);
  if (!row) return null;
  if (!row.credentialsEncrypted) return {};
  const plaintext = await decryptPii(row.credentialsEncrypted);
  if (!plaintext) return {};
  try {
    return JSON.parse(plaintext) as MessengerCredentials;
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const orgId = url.searchParams.get('org');
  const channelId = url.searchParams.get('channel');

  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (!mode || !token || !challenge) {
    return NextResponse.json({ ok: true, service: 'koreaglowup-messenger-webhook' });
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

  let payload: MessengerWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as MessengerWebhookPayload;
  } catch {
    return NextResponse.json({ ok: true, note: 'unparseable_body' });
  }

  // The same app + webhook URL can fire for `instagram` or
  // `whatsapp_business_account` objects when the operator dual-
  // subscribed. Filter to page events only.
  if (payload.object !== 'page') {
    return NextResponse.json({ ok: true, note: 'non_page_payload' });
  }

  let processed = 0;
  let failed = 0;

  for (const entry of payload.entry ?? []) {
    const pageId = entry.id; // Facebook Page ID — useful for audit/debug
    for (const event of entry.messaging ?? []) {
      try {
        const parsed = parseMessengerEvent(event, pageId);
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
            // Messenger doesn't expose country reliably without an
            // extra Graph API call to fetch user profile; skip and
            // let inbox-router ratchet contactLocale from detection.
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
              source: 'messenger_webhook',
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

type MessengerWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    time?: number;
    messaging?: Array<Record<string, unknown>>;
  }>;
};

type ParsedMessengerMessage = {
  text: string;
  userId: string;       // PSID — Page-Scoped User ID
  userName?: string;
  threadId: string;     // also PSID (1:1)
  messageId?: string;
  sentAt: Date;
};

/**
 * Extract a routable message from one entry.messaging[i] event.
 *
 * Routed:
 *   - text message:           event.message.text
 *   - quick-reply tap:        event.message.quick_reply.payload (text)
 *   - postback (button tap):  event.postback.title || event.postback.payload
 *
 * Skipped (audit_log + return null):
 *   - is_echo === true        (our own outbound bouncing back)
 *   - attachments             (image/video/file/location/template/fallback)
 *   - reaction events         (event.reaction)
 *   - delivery / read receipts (event.delivery / event.read)
 *   - optin (referral)        — could be routed later for QR-code attribution
 */
function parseMessengerEvent(
  event: Record<string, unknown>,
  _pageId: string | undefined,
): ParsedMessengerMessage | null {
  const sender = event.sender as { id?: string } | undefined;
  if (!sender?.id) return null;

  // Read receipts / delivery come without a `message`. Skip them.
  if (!event.message && !event.postback) return null;

  // Echo guard — `event.message.is_echo === true` means Meta is
  // bouncing our OWN outbound back to us, which would duplicate the
  // composer message in the inbox.
  const message = event.message as
    | {
        mid?: string;
        text?: string;
        is_echo?: boolean;
        quick_reply?: { payload?: string };
      }
    | undefined;
  if (message?.is_echo === true) return null;

  let text: string | null = null;
  let messageId: string | undefined;

  if (message) {
    text =
      (typeof message.text === 'string' && message.text) ||
      (typeof message.quick_reply?.payload === 'string' && message.quick_reply.payload) ||
      null;
    messageId = typeof message.mid === 'string' ? message.mid : undefined;
  } else if (event.postback) {
    const pb = event.postback as { title?: string; payload?: string };
    text =
      (typeof pb.title === 'string' && pb.title) ||
      (typeof pb.payload === 'string' && pb.payload) ||
      null;
  }

  if (!text) return null;

  const ts =
    typeof event.timestamp === 'number' ? new Date(event.timestamp) : new Date();

  return {
    text,
    userId: sender.id,
    threadId: sender.id, // Messenger 1:1 = thread is the user's PSID
    messageId,
    sentAt: ts,
  };
}
