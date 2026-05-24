import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { channels } from '@/drizzle/schema/channels';
import { conversations } from '@/drizzle/schema/conversations';
import { messages } from '@/drizzle/schema/messages';
import { translateInboundMessage } from '@/lib/ai/translation';
import { callerFromCtx } from '@/lib/ai/router';

/**
 * Normalized event the webhook handlers feed into the inbox. The router
 * upserts the conversation + appends the message + bumps unread/last
 * inbound timestamps. One call = one inbox row visible to the user.
 */
export type IncomingMessage = {
  organizationId: string;
  channelId: string;
  externalThreadId: string;
  externalMessageId?: string;
  contact: {
    externalId: string;
    displayName?: string;
    locale?: string;
    countryCode?: string;
    avatarUrl?: string;
  };
  body: string;
  bodyLocale?: string;
  sentAt?: Date;
  raw?: Record<string, unknown>;
};

export type RouteResult = {
  conversationId: string;
  messageId: string;
  isNewConversation: boolean;
};

/**
 * Route a single inbound message into the inbox.
 *
 * 1. Find or create the conversation (one per externalThreadId per channel)
 * 2. Insert the message row (inbound, sender=patient)
 * 3. Bump conversation.unreadCount, lastInboundAt, updatedAt
 * 4. Touch channels.lastSyncAt so the connection page shows life
 */
export async function routeIncomingMessage(input: IncomingMessage): Promise<RouteResult> {
  const sentAt = input.sentAt ?? new Date();

  // 1. Confirm the channel belongs to this org (defence-in-depth; webhook
  //    handler already validates but we don't trust the upstream).
  const [channel] = await db
    .select({ id: channels.id, organizationId: channels.organizationId })
    .from(channels)
    .where(
      and(
        eq(channels.id, input.channelId),
        eq(channels.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!channel) throw new Error('channel_not_found');

  // 2. Find existing conversation by (channelId, externalThreadId)
  let conversationId: string;
  let isNew = false;
  const [existing] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.channelId, input.channelId),
        eq(conversations.externalThreadId, input.externalThreadId),
      ),
    )
    .limit(1);

  if (existing) {
    conversationId = existing.id;
  } else {
    isNew = true;
    const [created] = await db
      .insert(conversations)
      .values({
        organizationId: input.organizationId,
        channelId: input.channelId,
        externalThreadId: input.externalThreadId,
        contactDisplayName: input.contact.displayName ?? null,
        contactExternalId: input.contact.externalId,
        contactCountryCode: input.contact.countryCode ?? null,
        contactLocale: input.contact.locale ?? null,
        contactAvatarUrl: input.contact.avatarUrl ?? null,
        stage: 'lead',
        priority: 'normal',
        unreadCount: 0,
        lastInboundAt: sentAt,
      })
      .returning({ id: conversations.id });
    if (!created) throw new Error('conversation_create_failed');
    conversationId = created.id;
  }

  // 3. Insert the message FIRST (so the inbox shows it within ms even if
  //    translation takes a beat). Translation patches the row asynchronously
  //    afterwards.
  const [msg] = await db
    .insert(messages)
    .values({
      organizationId: input.organizationId,
      conversationId,
      direction: 'inbound',
      senderRole: 'patient',
      contentType: 'text',
      body: input.body,
      bodyLocale: input.bodyLocale ?? null,
      externalMessageId: input.externalMessageId ?? null,
      sentAt,
      metadata: input.raw ? { raw: input.raw } : {},
      status: 'delivered',
    })
    .returning({ id: messages.id });
  if (!msg) throw new Error('message_create_failed');

  // 3b. Real-time AI translation (best-effort). Runs in the same request
  //     so the next /api/agency/inbox poll returns translations attached.
  //     Failures are swallowed — message stays visible without translation
  //     rather than blocking inbox display.
  try {
    const result = await translateInboundMessage(
      callerFromCtx({ orgId: input.organizationId, userId: null }, {
        entityType: 'message',
        entityId: msg.id,
      }),
      input.body,
      input.bodyLocale,
    );
    if (result.translationKo || result.translationEn) {
      await db
        .update(messages)
        .set({
          translationKo: result.translationKo,
          translationEn: result.translationEn,
          bodyLocale: input.bodyLocale ?? result.detectedLocale,
        })
        .where(eq(messages.id, msg.id));
    }
  } catch {
    // swallow — translation is non-essential
  }

  // 4. Bump conversation counters atomically
  await db
    .update(conversations)
    .set({
      unreadCount: sql`${conversations.unreadCount} + 1`,
      lastInboundAt: sentAt,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, conversationId));

  // 5. Touch channel sync timestamp
  await db
    .update(channels)
    .set({ lastSyncAt: new Date() })
    .where(eq(channels.id, input.channelId));

  return { conversationId, messageId: msg.id, isNewConversation: isNew };
}
