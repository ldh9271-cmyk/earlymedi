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
 * WhatsApp Business (Meta Cloud API) webhook.
 *
 * URL pattern: /api/webhooks/whatsapp?org=<orgId>&channel=<channelId>
 *
 * Operator setup (developers.facebook.com):
 *   1. Create a Meta app → add "WhatsApp" product → connect a
 *      WhatsApp Business Account (WABA).
 *   2. From WhatsApp > API Setup, grab:
 *        - Phone Number ID  (numeric)
 *        - WhatsApp Business Account ID (numeric)
 *        - Temporary access token (24h) → for testing only;
 *          for production, create a System User in Business Manager
 *          and issue a Permanent Token with whatsapp_business_messaging
 *          + whatsapp_business_management scopes.
 *   3. From the app's main settings > Basic, copy App Secret.
 *   4. Make up a random "verify token" (any 16+ char string).
 *   5. Paste all 5 fields into KoreaGlowUp > 채널 연결 > WhatsApp >
 *      연결하기 → save.
 *   6. In Meta app > WhatsApp > Configuration > Webhook:
 *        - Callback URL: KoreaGlowUp 가 표시한 webhook URL
 *        - Verify token: 같은 값 입력
 *        - Click "Verify and save" → Meta GET 으로 hub.challenge 검증
 *        - Webhook fields: subscribe to `messages`
 *   7. (Optional but recommended) Pin the access token rotation cadence;
 *      System User Permanent Tokens don't expire unless rotated.
 *
 * Security:
 *   POST is signed with HMAC-SHA256 in the `x-hub-signature-256` header
 *   (format: `sha256=<hex>`). We require the app secret to be configured
 *   and reject any unsigned or mis-signed body with 401.
 *
 *   GET handshake echoes `hub.challenge` only when `hub.verify_token`
 *   matches the per-channel value (constant-time compare).
 *
 * Failure-mode design:
 *   - GET with bad token → 403 so Meta surfaces the error in the
 *     "Verify" UI (this is the one place where we DON'T silently ack).
 *   - POST without org/channel → 400 (operator misconfigured URL).
 *   - POST with bad signature → 401 (someone forging messages).
 *   - All other branches → 200 OK; diagnostics in audit_logs to keep
 *     Meta from disabling the subscription.
 *
 * 24-hour customer service window:
 *   WhatsApp lets you send free-form text only within 24h of the
 *   patient's last inbound message. Past that window you must send a
 *   pre-approved template message (HSM). The outbound adapter
 *   currently sends free-form `text` only — outside the window the
 *   adapter returns ok:false with a friendly error pointing at the
 *   24h limit. Template support is a follow-up step.
 */

type WhatsAppCredentials = {
  phoneNumberId?: string;
  accessToken?: string;
  wabaId?: string;
  verifyToken?: string;
  appSecret?: string;
};

async function loadChannelSecrets(
  orgId: string,
  channelId: string,
): Promise<WhatsAppCredentials | null> {
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
        eq(channels.kind, 'whatsapp'),
      ),
    )
    .limit(1);
  if (!row) return null;
  if (!row.credentialsEncrypted) return {};
  const plaintext = await decryptPii(row.credentialsEncrypted);
  if (!plaintext) return {};
  try {
    return JSON.parse(plaintext) as WhatsAppCredentials;
  } catch {
    return {};
  }
}

/**
 * Verify the GET handshake. Meta sends:
 *   ?hub.mode=subscribe&hub.verify_token=<TOKEN>&hub.challenge=<RANDOM>
 * We must echo `hub.challenge` as the response body when
 * `hub.verify_token` matches our per-channel value.
 *
 * Constant-time compare avoids letting attackers probe the verify
 * token character-by-character via timing.
 */
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

  // No hub.* params → friendly OK for operator browser visits.
  if (!mode || !token || !challenge) {
    return NextResponse.json({ ok: true, service: 'koreaglowup-whatsapp-webhook' });
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

  // Echo back the challenge as plain text body — Meta expects exactly
  // this string, not wrapped in JSON.
  return new NextResponse(challenge, { status: 200 });
}

/**
 * x-hub-signature-256 = `sha256=<hex>` where hex = HMAC-SHA256(
 * app_secret, raw_body ).
 *
 * Returns false on any malformed input. Never throws.
 */
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

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    return NextResponse.json({ ok: true, note: 'unparseable_body' });
  }

  if (payload.object !== 'whatsapp_business_account') {
    return NextResponse.json({ ok: true, note: 'non_whatsapp_payload' });
  }

  let processed = 0;
  let failed = 0;

  // entry[] usually has one element; changes[] usually has one too,
  // but Meta technically batches — iterate everything.
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue; // ignore status, etc.
      const value = change.value;
      if (!value) continue;

      // Status callbacks (delivered/read/failed) come through with
      // `value.statuses` instead of `value.messages`. Log them
      // separately so we can wire delivery receipts later, but don't
      // route into the inbox.
      if (value.statuses && !value.messages) continue;

      const contactName = value.contacts?.[0]?.profile?.name;

      for (const message of value.messages ?? []) {
        try {
          const parsed = parseWhatsAppMessage(message, contactName);
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
              // Phone numbers start with country code — derive ISO
              // 2-letter where straightforward.
              countryCode: phonePrefixToCountry(parsed.userId),
            },
            body: parsed.text,
            bodyLocale,
            sentAt: parsed.sentAt,
            raw: message as unknown as Record<string, unknown>,
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
                source: 'whatsapp_webhook',
                routeError: err instanceof Error ? err.message : 'unknown',
              },
              metadata: { rawEvent: message },
            });
          } catch {
            /* swallow */
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true, processed, failed });
}

// ─── Types & parsers ──────────────────────────────────────────────────

type WhatsAppWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        messaging_product?: string;
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<Record<string, unknown>>;
        statuses?: Array<Record<string, unknown>>;
      };
    }>;
  }>;
};

type ParsedWhatsAppMessage = {
  text: string;
  userId: string;
  userName?: string;
  threadId: string;
  messageId?: string;
  sentAt: Date;
};

/**
 * Pull the text out of a WhatsApp message object.
 *
 * Routed:
 *   - type=text     → message.text.body
 *   - type=button   → message.button.text (template button reply)
 *   - type=interactive → list / button reply title (best-effort)
 *
 * Skipped (returns null, will not appear in inbox today):
 *   - image / video / audio / document / sticker / location / contacts
 *   - reaction
 *   - system messages
 * Media routing is a follow-up; the audit_logs row preserves the raw
 * event so we can backfill once attachments are wired.
 */
function parseWhatsAppMessage(
  message: Record<string, unknown>,
  contactName: string | undefined,
): ParsedWhatsAppMessage | null {
  const from = message.from;
  const id = message.id;
  const ts = message.timestamp;
  if (typeof from !== 'string' || !from) return null;

  let text: string | null = null;
  const type = message.type;
  if (type === 'text') {
    const t = message.text as { body?: string } | undefined;
    if (typeof t?.body === 'string') text = t.body;
  } else if (type === 'button') {
    const b = message.button as { text?: string } | undefined;
    if (typeof b?.text === 'string') text = b.text;
  } else if (type === 'interactive') {
    const i = message.interactive as
      | {
          type?: string;
          list_reply?: { title?: string };
          button_reply?: { title?: string };
        }
      | undefined;
    text =
      (i?.type === 'list_reply' && typeof i.list_reply?.title === 'string'
        ? i.list_reply.title
        : null) ??
      (i?.type === 'button_reply' && typeof i.button_reply?.title === 'string'
        ? i.button_reply.title
        : null);
  }

  if (!text) return null;

  // Timestamp is a string of unix seconds in WhatsApp's payload.
  const sentAt =
    typeof ts === 'string' && /^\d+$/.test(ts)
      ? new Date(parseInt(ts, 10) * 1000)
      : new Date();

  return {
    text,
    userId: from,
    userName: contactName,
    threadId: from, // 1:1 chat — thread = wa_id (E.164 phone)
    messageId: typeof id === 'string' ? id : undefined,
    sentAt,
  };
}

/**
 * Best-effort phone prefix → ISO 2-letter country mapping for the
 * common KoreaGlowUp source markets. Falls back to undefined so the
 * router doesn't claim a country we can't be sure of.
 *
 * WhatsApp `wa_id` is E.164 without the leading '+', e.g. '821012345678'.
 */
function phonePrefixToCountry(phone: string): string | undefined {
  if (!/^\d+$/.test(phone)) return undefined;
  // Order matters — longer prefixes first.
  if (phone.startsWith('852')) return 'HK';
  if (phone.startsWith('853')) return 'MO';
  if (phone.startsWith('886')) return 'TW';
  if (phone.startsWith('971')) return 'AE';
  if (phone.startsWith('966')) return 'SA';
  if (phone.startsWith('974')) return 'QA';
  if (phone.startsWith('965')) return 'KW';
  if (phone.startsWith('968')) return 'OM';
  if (phone.startsWith('973')) return 'BH';
  if (phone.startsWith('962')) return 'JO';
  if (phone.startsWith('961')) return 'LB';
  if (phone.startsWith('98')) return 'IR';
  if (phone.startsWith('91')) return 'IN';
  if (phone.startsWith('92')) return 'PK';
  if (phone.startsWith('66')) return 'TH';
  if (phone.startsWith('84')) return 'VN';
  if (phone.startsWith('86')) return 'CN';
  if (phone.startsWith('82')) return 'KR';
  if (phone.startsWith('81')) return 'JP';
  if (phone.startsWith('65')) return 'SG';
  if (phone.startsWith('60')) return 'MY';
  if (phone.startsWith('63')) return 'PH';
  if (phone.startsWith('62')) return 'ID';
  if (phone.startsWith('7')) return 'RU';
  if (phone.startsWith('44')) return 'GB';
  if (phone.startsWith('49')) return 'DE';
  if (phone.startsWith('33')) return 'FR';
  if (phone.startsWith('1')) return 'US';
  return undefined;
}
