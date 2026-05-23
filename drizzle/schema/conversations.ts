import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';
import { channels } from './channels';
import {
  conversationAssigneeRoleEnum,
  conversationPriorityEnum,
  conversationStageEnum,
} from './messaging-enums';

/**
 * conversations
 *
 * A single chat thread with one external party (patient/lead) over one
 * specific channel. The `externalThreadId` is the channel's native id
 * (Kakao chat_id, Instagram thread_id, WhatsApp conversation id, etc.).
 *
 * Conversations are first-class objects: stage promotion (lead → qualified
 * → case → quoted → booked) is what drives the operational funnel.
 */
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),

    externalThreadId: text('external_thread_id').notNull(),

    // Patient/lead display (denormalized; full record lives in patients in Phase 4)
    contactDisplayName: text('contact_display_name'),
    contactExternalId: text('contact_external_id'), // channel user id
    contactCountryCode: text('contact_country_code'),
    contactLocale: text('contact_locale'),
    contactAvatarUrl: text('contact_avatar_url'),

    // Phase-4 link
    patientId: uuid('patient_id'),
    leadId: uuid('lead_id'),
    caseId: uuid('case_id'),

    stage: conversationStageEnum('stage').notNull().default('lead'),
    priority: conversationPriorityEnum('priority').notNull().default('normal'),

    subject: text('subject'), // optional human title
    summary: text('summary'), // AI-generated 1-line summary (Phase 3)
    aiIntentClass: text('ai_intent_class'), // e.g. "rhinoplasty_quote_request"
    aiSentimentScore: integer('ai_sentiment_score'), // -100..100

    unreadCount: integer('unread_count').notNull().default(0),
    isArchived: boolean('is_archived').notNull().default(false),
    isStarred: boolean('is_starred').notNull().default(false),
    isMuted: boolean('is_muted').notNull().default(false),

    lastInboundAt: timestamp('last_inbound_at', { withTimezone: true }),
    lastOutboundAt: timestamp('last_outbound_at', { withTimezone: true }),
    firstResponseAt: timestamp('first_response_at', { withTimezone: true }),

    tagsJson: jsonb('tags_json').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgStageIdx: index('conversations_org_stage_idx').on(t.organizationId, t.stage),
    orgLastInboundIdx: index('conversations_org_last_inbound_idx').on(
      t.organizationId,
      t.lastInboundAt,
    ),
    channelThreadUnique: uniqueIndex('conversations_channel_thread_unique').on(
      t.channelId,
      t.externalThreadId,
    ),
    patientIdx: index('conversations_patient_idx').on(t.patientId),
    caseIdx: index('conversations_case_idx').on(t.caseId),
  }),
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

/**
 * conversation_assignees
 *
 * M:N — who's responsible for this conversation. Primary assignee gets
 * push/email notifications; observers see it in shared queues only.
 */
export const conversationAssignees = pgTable(
  'conversation_assignees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: conversationAssigneeRoleEnum('role').notNull().default('primary'),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    assignedById: uuid('assigned_by_id').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => ({
    convUserUnique: uniqueIndex('conversation_assignees_conv_user_unique').on(
      t.conversationId,
      t.userId,
    ),
    convIdx: index('conversation_assignees_conv_idx').on(t.conversationId),
    userIdx: index('conversation_assignees_user_idx').on(t.userId),
  }),
);

export type ConversationAssignee = typeof conversationAssignees.$inferSelect;
export type NewConversationAssignee = typeof conversationAssignees.$inferInsert;
