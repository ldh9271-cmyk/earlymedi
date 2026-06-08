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
 * Telegram Bot webhook.
 *
 * URL pattern: /api/webhooks/telegram?org=<orgId>&channel=<channelId>
 *
 * Operator setup (@BotFather on Telegram):
 *   1. /newbot in @BotFather → choose name + @username → receive
 *      Bot Token (123456:ABC-DEF...).
 *   2. (Optional but recommended) generate a random 16+ character
 *      secret string yourself — used as setWebhook's secret_token
 *      so Telegram includes it on every webhook POST as the
 *      X-Telegram-Bot-Api-Secret-Token header.
 *   3. KoreaGlowUp > 채널 연결 > Telegram > 연결하기 → paste token
 *      (+ optional secret) → save.
 *   4. KoreaGlowUp returns the webhook URL. Either:
 *        a) Click the "Webhook 자동 등록" button in the connection
 *           card (calls Telegram setWebhook for you), OR
 *        b) Paste this curl in a terminal:
 *             curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
 *               -d "url=<URL>&secret_token=<SECRET>"
 *   5. Send /start to your bot from a private Telegram chat — should
 *      land in /agency/inbox within seconds.
 *
 * Security:
 *   Telegram does NOT HMAC-sign payloads (unlike LINE / WeChat). The
 *   two recommended mitigations are:
 *     1. URL secret: the channel UUID in the query is already
 *        unguessable (122 bits of entropy). Combined with the
 *        channel-belongs-to-org SELECT, this is the baseline.
 *     2. secret_token: if the operator set one in setWebhook, we
 *        require it on every POST and reject mismatches with 401.
 *   We do BOTH. The URL check stops drive-by probes; the optional
 *   header lifts security to where the URL alone is insufficient.
 *
 * Failure-mode design:
 *   Always return 200 quickly so Telegram doesn't backoff. Diagnostics
 *   land in audit_logs. We also don't respond with a message in the
 *   webhook (no reply_to_message_id wrapper) — agent replies flow
 *   via the outbound adapter so timing is concierge-controlled.
 */

type TelegramCredentials = {
  botToken?: string;
  webhookSecret?: string;
};

async function loadChannelSecrets(
  orgId: string,
  channelId: string,
): Promise<TelegramCredentials | null> {
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
        eq(channels.kind, 'telegram'),
      ),
    )
    .limit(1);
  if (!row) return null;
  if (!row.credentialsEncrypted) return {};
  const plaintext = await decryptPii(row.credentialsEncrypted);
  if (!plaintext) return {};
  try {
    return JSON.parse(plaintext) as TelegramCredentials;
  } catch {
    return {};
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true, service: 'koreaglowup-telegram-webhook' });
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

  // Optional secret_token header verification. If the operator set
  // a secret in setWebhook, Telegram includes it on every POST and
  // we MUST match — a mismatch means either someone is spoofing or
  // the operator rotated the secret without updating the channel
  // row. Either way, reject.
  if (secrets.webhookSecret) {
    const incoming = request.headers.get('x-telegram-bot-api-secret-token');
    if (incoming !== secrets.webhookSecret) {
      return NextResponse.json({ error: 'invalid_secret_token' }, { status: 401 });
    }
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true, note: 'unparseable_body' });
  }

  const parsed = parseTelegramUpdate(body);
  if (!parsed) {
    // Non-text updates (edited_message, channel_post, callback_query,
    // poll, etc.) are not yet routed. Log them for visibility but
    // ack 200 so Telegram doesn't disable the webhook.
    try {
      await db.insert(auditLogs).values({
        organizationId: orgId,
        actorUserId: null,
        action: 'create',
        entityType: 'message',
        entityId: null,
        diff: { source: 'telegram_webhook', parseFailed: true },
        metadata: { rawEvent: body },
      });
    } catch {
      /* swallow */
    }
    return NextResponse.json({ ok: true, note: 'unsupported_update_type' });
  }

  const detected = detectLocale(parsed.text);
  const bodyLocale = detected === 'other' ? undefined : detected;

  try {
    await routeIncomingMessage({
      organizationId: orgId,
      channelId,
      externalThreadId: parsed.threadId,
      externalMessageId: parsed.messageId,
      contact: {
        externalId: parsed.userId,
        displayName: parsed.userName,
        // Telegram tells us the user's language_code (BCP-47-ish).
        // Prefer Telegram's hint over body-detection because the
        // first message is often a short '/start' that detectLocale
        // would label 'other'. Body detection still wins for
        // confidently-detected non-Latin scripts via inbox-router.
        locale: bodyLocale ?? parsed.languageCode ?? undefined,
        // Telegram doesn't expose country directly — leave null
        // and let downstream stages enrich (we'd guess RU/MENA
        // for the bulk of Telegram patients but that's policy,
        // not a fact about this contact).
      },
      body: parsed.text,
      bodyLocale,
      sentAt: parsed.sentAt,
      raw: body,
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
          source: 'telegram_webhook',
          routeError: err instanceof Error ? err.message : 'unknown',
        },
        metadata: { rawEvent: body },
      });
    } catch {
      /* swallow */
    }
    return NextResponse.json({ ok: true, note: 'route_error_logged' });
  }
}

type ParsedTelegramMessage = {
  text: string;
  userId: string;
  userName?: string;
  languageCode?: string;
  threadId: string;
  messageId?: string;
  sentAt: Date;
};

/**
 * Parse a Telegram Update object.
 *
 * Telegram bundles many event flavors in `Update`. We currently route
 * only:
 *   - update.message     (regular 1:1 chat text)
 *   - update.channel_post (text posted to a channel we administer)
 *
 * Edited messages, callbacks, polls, etc. are ignored on purpose —
 * routing them as new inbound would create misleading dupes in the
 * inbox. Spec: https://core.telegram.org/bots/api#update
 *
 * For text we also support /start and /help — they come through as
 * regular text messages anyway, but stripping the leading slash for
 * display has been considered and rejected: agents benefit from
 * seeing the raw command (helps debug onboarding issues).
 */
function parseTelegramUpdate(body: Record<string, unknown>): ParsedTelegramMessage | null {
  const message =
    (body.message as Record<string, unknown> | undefined) ??
    (body.channel_post as Record<string, unknown> | undefined);
  if (!message) return null;

  const text = message.text;
  if (typeof text !== 'string' || !text) return null;

  const from = message.from as
    | { id?: number; first_name?: string; last_name?: string; username?: string; language_code?: string }
    | undefined;
  const chat = message.chat as { id?: number; type?: string } | undefined;
  if (!chat?.id) return null;

  // 1:1 chats only for now — group / supergroup conversations need
  // different routing (multiple human participants vs one patient).
  if (chat.type && chat.type !== 'private') return null;

  const userId = from?.id ? String(from.id) : String(chat.id);
  const userName = from
    ? from.first_name
      ? `${from.first_name}${from.last_name ? ' ' + from.last_name : ''}${from.username ? ' (@' + from.username + ')' : ''}`
      : from.username
        ? `@${from.username}`
        : undefined
    : undefined;

  const dateSeconds = typeof message.date === 'number' ? message.date : Math.floor(Date.now() / 1000);
  return {
    text,
    userId,
    userName,
    languageCode: from?.language_code,
    threadId: String(chat.id),
    messageId: typeof message.message_id === 'number' ? String(message.message_id) : undefined,
    sentAt: new Date(dateSeconds * 1000),
  };
}
