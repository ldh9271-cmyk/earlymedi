import 'server-only';
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../client';
import { conversations } from '@/drizzle/schema/conversations';
import { channels } from '@/drizzle/schema/channels';
import { messages } from '@/drizzle/schema/messages';
import type { ChannelKind } from '@/lib/channels/types';

export type InboxFilter = {
  channelKinds?: ChannelKind[];
  stages?: Array<'lead' | 'qualified' | 'case' | 'quoted' | 'booked' | 'archived'>;
  countryCodes?: string[];
  unreadOnly?: boolean;
  starredOnly?: boolean;
  search?: string;
};

export type InboxConversation = {
  id: string;
  channelKind: ChannelKind;
  channelDisplayName: string;
  externalThreadId: string;
  contactDisplayName: string | null;
  contactCountryCode: string | null;
  contactLocale: string | null;
  contactAvatarUrl: string | null;
  stage: 'lead' | 'qualified' | 'case' | 'quoted' | 'booked' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  unreadCount: number;
  lastInboundAt: Date | null;
  lastOutboundAt: Date | null;
  subject: string | null;
  summary: string | null;
  aiIntentClass: string | null;
  tags: string[];
  lastMessagePreview: string | null;
  lastMessageTranslationKo: string | null;
};

export async function listInboxConversations(
  organizationId: string,
  filter: InboxFilter = {},
  limit = 80,
): Promise<InboxConversation[]> {
  const whereParts: SQL[] = [
    eq(conversations.organizationId, organizationId),
    eq(conversations.isArchived, false),
  ];

  // Use drizzle's inArray() helper — sql`= ANY(${jsArray})` doesn't
  // serialize JS arrays to a Postgres array literal (postgres-js complains
  // 'malformed array literal: "kakao"'). inArray expands to (a IN (b,c,d))
  // which postgres-js parameterises correctly.
  if (filter.channelKinds && filter.channelKinds.length > 0) {
    whereParts.push(inArray(channels.kind, filter.channelKinds));
  }
  if (filter.stages && filter.stages.length > 0) {
    whereParts.push(inArray(conversations.stage, filter.stages));
  }
  if (filter.countryCodes && filter.countryCodes.length > 0) {
    whereParts.push(inArray(conversations.contactCountryCode, filter.countryCodes));
  }
  if (filter.unreadOnly) {
    whereParts.push(sql`${conversations.unreadCount} > 0`);
  }
  if (filter.starredOnly) {
    whereParts.push(eq(conversations.isStarred, true));
  }
  if (filter.search && filter.search.length > 0) {
    const term = `%${filter.search}%`;
    const orClause = or(
      ilike(conversations.contactDisplayName, term),
      ilike(conversations.subject, term),
      ilike(conversations.aiIntentClass, term),
    );
    if (orClause) whereParts.push(orClause);
  }

  // Subquery: latest message per conversation (preview).
  const latestMsg = db.$with('latest_msg').as(
    db
      .select({
        conversationId: messages.conversationId,
        body: messages.body,
        translationKo: messages.translationKo,
        sentAt: messages.sentAt,
        rn: sql<number>`row_number() OVER (PARTITION BY ${messages.conversationId} ORDER BY ${messages.sentAt} DESC)`.as('rn'),
      })
      .from(messages)
      .where(eq(messages.organizationId, organizationId)),
  );

  const rows = await db
    .with(latestMsg)
    .select({
      id: conversations.id,
      channelKind: channels.kind,
      channelDisplayName: channels.displayName,
      externalThreadId: conversations.externalThreadId,
      contactDisplayName: conversations.contactDisplayName,
      contactCountryCode: conversations.contactCountryCode,
      contactLocale: conversations.contactLocale,
      contactAvatarUrl: conversations.contactAvatarUrl,
      stage: conversations.stage,
      priority: conversations.priority,
      unreadCount: conversations.unreadCount,
      lastInboundAt: conversations.lastInboundAt,
      lastOutboundAt: conversations.lastOutboundAt,
      subject: conversations.subject,
      summary: conversations.summary,
      aiIntentClass: conversations.aiIntentClass,
      tagsJson: conversations.tagsJson,
      lastMessagePreview: latestMsg.body,
      lastMessageTranslationKo: latestMsg.translationKo,
    })
    .from(conversations)
    .innerJoin(channels, eq(conversations.channelId, channels.id))
    .leftJoin(
      latestMsg,
      and(eq(latestMsg.conversationId, conversations.id), eq(latestMsg.rn, 1)),
    )
    .where(and(...whereParts))
    .orderBy(desc(conversations.lastInboundAt), desc(conversations.updatedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    channelKind: r.channelKind as ChannelKind,
    channelDisplayName: r.channelDisplayName,
    externalThreadId: r.externalThreadId,
    contactDisplayName: r.contactDisplayName,
    contactCountryCode: r.contactCountryCode,
    contactLocale: r.contactLocale,
    contactAvatarUrl: r.contactAvatarUrl,
    stage: r.stage,
    priority: r.priority,
    unreadCount: r.unreadCount,
    lastInboundAt: r.lastInboundAt,
    lastOutboundAt: r.lastOutboundAt,
    subject: r.subject,
    summary: r.summary,
    aiIntentClass: r.aiIntentClass,
    tags: r.tagsJson,
    lastMessagePreview: r.lastMessagePreview,
    lastMessageTranslationKo: r.lastMessageTranslationKo,
  }));
}

export type ConversationMessage = {
  id: string;
  direction: 'inbound' | 'outbound' | 'system';
  senderRole: 'patient' | 'agent' | 'ai_concierge' | 'system' | 'partner' | 'hospital';
  contentType: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'location' | 'voice_note' | 'system_notice' | 'template';
  body: string;
  bodyLocale: string | null;
  translationKo: string | null;
  translationEn: string | null;
  sentAt: Date;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  aiRiskFlags: string[];
  attachments: Array<{
    path: string;
    mimeType: string;
    sizeBytes: number;
    previewUrl?: string;
  }>;
};

export async function loadConversationDetail(
  organizationId: string,
  conversationId: string,
): Promise<{
  conversation: InboxConversation;
  messages: ConversationMessage[];
} | null> {
  const [conv] = await listInboxConversations(organizationId, undefined, 1).then(async (all) =>
    all.filter((c) => c.id === conversationId),
  );
  const conversation = conv ?? null;
  // Need a direct fetch when filter didn't match — fallback:
  let resolved = conversation;
  if (!resolved) {
    const rows = await db
      .select({
        id: conversations.id,
        channelKind: channels.kind,
        channelDisplayName: channels.displayName,
        externalThreadId: conversations.externalThreadId,
        contactDisplayName: conversations.contactDisplayName,
        contactCountryCode: conversations.contactCountryCode,
        contactLocale: conversations.contactLocale,
        contactAvatarUrl: conversations.contactAvatarUrl,
        stage: conversations.stage,
        priority: conversations.priority,
        unreadCount: conversations.unreadCount,
        lastInboundAt: conversations.lastInboundAt,
        lastOutboundAt: conversations.lastOutboundAt,
        subject: conversations.subject,
        summary: conversations.summary,
        aiIntentClass: conversations.aiIntentClass,
        tagsJson: conversations.tagsJson,
      })
      .from(conversations)
      .innerJoin(channels, eq(conversations.channelId, channels.id))
      .where(
        and(eq(conversations.organizationId, organizationId), eq(conversations.id, conversationId)),
      )
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    resolved = {
      id: r.id,
      channelKind: r.channelKind as ChannelKind,
      channelDisplayName: r.channelDisplayName,
      externalThreadId: r.externalThreadId,
      contactDisplayName: r.contactDisplayName,
      contactCountryCode: r.contactCountryCode,
      contactLocale: r.contactLocale,
      contactAvatarUrl: r.contactAvatarUrl,
      stage: r.stage,
      priority: r.priority,
      unreadCount: r.unreadCount,
      lastInboundAt: r.lastInboundAt,
      lastOutboundAt: r.lastOutboundAt,
      subject: r.subject,
      summary: r.summary,
      aiIntentClass: r.aiIntentClass,
      tags: r.tagsJson,
      lastMessagePreview: null,
      lastMessageTranslationKo: null,
    };
  }

  const msgs = await db
    .select({
      id: messages.id,
      direction: messages.direction,
      senderRole: messages.senderRole,
      contentType: messages.contentType,
      body: messages.body,
      bodyLocale: messages.bodyLocale,
      translationKo: messages.translationKo,
      translationEn: messages.translationEn,
      sentAt: messages.sentAt,
      status: messages.status,
      aiRiskFlagsJson: messages.aiRiskFlagsJson,
      attachmentsJson: messages.attachmentsJson,
    })
    .from(messages)
    .where(
      and(eq(messages.organizationId, organizationId), eq(messages.conversationId, conversationId)),
    )
    .orderBy(messages.sentAt);

  return {
    conversation: resolved,
    messages: msgs.map((m) => ({
      id: m.id,
      direction: m.direction,
      senderRole: m.senderRole,
      contentType: m.contentType,
      body: m.body,
      bodyLocale: m.bodyLocale,
      translationKo: m.translationKo,
      translationEn: m.translationEn,
      sentAt: m.sentAt,
      status: m.status,
      aiRiskFlags: m.aiRiskFlagsJson,
      attachments: m.attachmentsJson,
    })),
  };
}
