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
 * WeChat Official Account webhook.
 *
 * URL pattern: /api/webhooks/wechat?org=<orgId>&channel=<channelId>
 *
 * WeChat has two flavors of traffic to this endpoint:
 *
 *   GET  — URL verification handshake (mandatory). WeChat sends
 *          ?signature=&timestamp=&nonce=&echostr= when the operator
 *          clicks "Save" on the Server Config page. We must:
 *            1. SHA1-sort([token, timestamp, nonce]).join('')
 *            2. Compare digest hex == signature
 *            3. Return echostr as the raw response body
 *          If we don't echo back, WeChat refuses to save the URL.
 *
 *   POST — Inbound message (text / image / event). Body is XML, not
 *          JSON. We parse the small set of fields we care about
 *          (FromUserName / Content / MsgId) and route through the
 *          shared inbox-router. Always return the literal string
 *          "success" within 5 seconds — WeChat treats anything else
 *          as a failure and may re-deliver up to 3 times.
 *
 * Encryption (EncodingAESKey) mode is NOT yet implemented — only
 * 平文 모드 (plaintext) works. The credential field is captured so
 * future iterations can flip to safe mode.
 */

type ChannelSecret = {
  appId?: string;
  appSecret?: string;
  token?: string;
  encodingAESKey?: string;
};

async function loadChannelSecrets(
  orgId: string,
  channelId: string,
): Promise<ChannelSecret | null> {
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
        eq(channels.kind, 'wechat'),
      ),
    )
    .limit(1);
  if (!row) return null;
  if (!row.credentialsEncrypted) return {};
  const plaintext = await decryptPii(row.credentialsEncrypted);
  if (!plaintext) return {};
  try {
    return JSON.parse(plaintext) as ChannelSecret;
  } catch {
    return {};
  }
}

/**
 * Verify the GET handshake. WeChat's algorithm is:
 *   sha1(sort([token, timestamp, nonce]).join('')) === signature
 * Sort is **lexicographic on the strings**, not numeric.
 */
function verifyHandshake(
  token: string,
  timestamp: string,
  nonce: string,
  signature: string,
): boolean {
  if (!token || !timestamp || !nonce || !signature) return false;
  const sorted = [token, timestamp, nonce].sort().join('');
  const digest = crypto.createHash('sha1').update(sorted).digest('hex');
  // Use a timing-safe compare so attackers can't probe the token
  // character-by-character via response time.
  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest, 'utf8'),
      Buffer.from(signature, 'utf8'),
    );
  } catch {
    return false;
  }
}

/**
 * Extract a single tag's text content from WeChat's XML envelope.
 * Handles both `<tag><![CDATA[value]]></tag>` and `<tag>value</tag>`.
 * Returns null when the tag isn't present.
 */
function xmlField(xml: string, tag: string): string | null {
  const re = new RegExp(
    `<${tag}>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))\\s*</${tag}>`,
    'i',
  );
  const m = xml.match(re);
  if (!m) return null;
  return m[1] ?? m[2] ?? null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const orgId = url.searchParams.get('org');
  const channelId = url.searchParams.get('channel');
  const signature = url.searchParams.get('signature') ?? '';
  const timestamp = url.searchParams.get('timestamp') ?? '';
  const nonce = url.searchParams.get('nonce') ?? '';
  const echostr = url.searchParams.get('echostr') ?? '';

  if (!orgId || !channelId) {
    return NextResponse.json({ error: 'missing_org_or_channel' }, { status: 400 });
  }

  // No handshake params → return a service banner (useful for browser
  // smoke testing the URL is reachable).
  if (!signature || !timestamp || !nonce) {
    return NextResponse.json({ ok: true, service: 'earlymedi-wechat-webhook' });
  }

  const secrets = await loadChannelSecrets(orgId, channelId);
  if (!secrets) {
    return new NextResponse('unknown channel', { status: 404 });
  }
  const token = secrets.token;
  if (!token) {
    // Credentials missing — channel hasn't finished setup. Don't echo
    // back; WeChat will report verification failure to the operator
    // and they'll know to check the KoreaGlowUp connection form first.
    return new NextResponse('token_not_configured', { status: 400 });
  }

  if (!verifyHandshake(token, timestamp, nonce, signature)) {
    return new NextResponse('signature_mismatch', { status: 401 });
  }

  // Verified — echo back the random echostr verbatim. WeChat saves the
  // URL only after seeing this exact response (plain text, no JSON).
  return new NextResponse(echostr, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const orgId = url.searchParams.get('org');
  const channelId = url.searchParams.get('channel');

  if (!orgId || !channelId) {
    return NextResponse.json({ error: 'missing_org_or_channel' }, { status: 400 });
  }

  // Optional: verify each POST is signed too (WeChat appends the same
  // signature query params to every inbound message in plaintext mode).
  const signature = url.searchParams.get('signature') ?? '';
  const timestamp = url.searchParams.get('timestamp') ?? '';
  const nonce = url.searchParams.get('nonce') ?? '';

  const secrets = await loadChannelSecrets(orgId, channelId);
  if (!secrets) {
    return new NextResponse('unknown channel', { status: 404 });
  }
  const token = secrets.token;
  if (token && signature && timestamp && nonce) {
    if (!verifyHandshake(token, timestamp, nonce, signature)) {
      // Don't 'success' or re-deliver will hammer us with the same bad
      // payload. 401 is what WeChat understands as "stop trying".
      return new NextResponse('signature_mismatch', { status: 401 });
    }
  }

  const xml = await request.text();

  // Encrypted mode (`Encrypt` tag wraps the whole envelope) is not yet
  // supported. Log + ack so the operator notices and switches the OA
  // to plaintext mode for now.
  if (/<Encrypt>/i.test(xml) && !/<MsgType>/i.test(xml)) {
    try {
      await db.insert(auditLogs).values({
        organizationId: orgId,
        actorUserId: null,
        action: 'create',
        entityType: 'message',
        entityId: null,
        diff: { source: 'wechat_webhook', encryptedModeUnsupported: true },
        metadata: { rawXmlPreview: xml.slice(0, 500) },
      });
    } catch {
      /* swallow */
    }
    return new NextResponse('success', { status: 200 });
  }

  const fromUser = xmlField(xml, 'FromUserName'); // sender openid
  const toUser = xmlField(xml, 'ToUserName'); // gh_xxx (our OA)
  const msgType = (xmlField(xml, 'MsgType') ?? '').toLowerCase();
  const content = xmlField(xml, 'Content');
  const msgId = xmlField(xml, 'MsgId') ?? undefined;
  const createTime = xmlField(xml, 'CreateTime');

  // Only handle text in v1. Images / voice / events get logged and
  // ack'd so WeChat doesn't retry, but they don't yet appear in inbox.
  if (msgType !== 'text' || !fromUser || !content) {
    try {
      await db.insert(auditLogs).values({
        organizationId: orgId,
        actorUserId: null,
        action: 'create',
        entityType: 'message',
        entityId: null,
        diff: { source: 'wechat_webhook', unhandledMsgType: msgType },
        metadata: { fromUser, toUser, rawXmlPreview: xml.slice(0, 500) },
      });
    } catch {
      /* swallow */
    }
    return new NextResponse('success', { status: 200 });
  }

  // WeChat 1:1 chat — threadId == sender openid (same shape as Kakao).
  const sentAt = createTime ? new Date(Number(createTime) * 1000) : new Date();

  // Auto-detect actual language from message text. WeChat OA users
  // ARE overwhelmingly Chinese (channel is China-only), so 'zh' is the
  // sane default — but Korean expats in Shanghai sometimes message in
  // Korean, and a Russian living in Beijing might message in Russian.
  // detectLocale catches these. Falls back to 'zh' when content is
  // ambiguous (emoji-only, sticker) since the channel context is China.
  const detected = detectLocale(content);
  const bodyLocale = detected === 'other' ? 'zh' : detected;
  try {
    await routeIncomingMessage({
      organizationId: orgId,
      channelId,
      externalThreadId: fromUser,
      externalMessageId: msgId,
      contact: {
        externalId: fromUser,
        // We don't get a display name in the basic message envelope —
        // would require an extra access-token call to /user/info. Skip
        // for v1; the operator can rename the contact in the inbox.
        displayName: undefined,
        locale: bodyLocale,
        countryCode: 'CN',
      },
      body: content,
      bodyLocale,
      sentAt,
      raw: { msgType, toUser, msgId, createTime },
    });
  } catch (err) {
    try {
      await db.insert(auditLogs).values({
        organizationId: orgId,
        actorUserId: null,
        action: 'create',
        entityType: 'message',
        entityId: null,
        diff: {
          source: 'wechat_webhook',
          routeError: err instanceof Error ? err.message : 'unknown',
        },
        metadata: { fromUser, rawXmlPreview: xml.slice(0, 500) },
      });
    } catch {
      /* swallow */
    }
    // Still 'success' so WeChat doesn't retry — we've logged the issue.
  }

  // WeChat expects the literal string "success" (or an XML reply
  // payload) within 5s. We never reply inline; if a passive reply is
  // wanted later, build it here with <xml><ToUserName>...</xml>.
  return new NextResponse('success', {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
