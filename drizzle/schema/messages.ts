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
import { conversations } from './conversations';
import {
  aiToneEnum,
  messageContentTypeEnum,
  messageDirectionEnum,
  messageStatusEnum,
  senderRoleEnum,
} from './messaging-enums';

/**
 * messages
 *
 * One row per message. Inbound messages get their original locale + a
 * machine-translated Korean rendering (Phase 3 fills `translation_ko`).
 * Outbound messages mirror the structure for audit and re-send.
 *
 * `attachmentsJson` references Supabase Storage object paths. Files are
 * never stored inline.
 */
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),

    direction: messageDirectionEnum('direction').notNull(),
    senderRole: senderRoleEnum('sender_role').notNull(),
    senderUserId: uuid('sender_user_id').references(() => users.id, { onDelete: 'set null' }),

    externalMessageId: text('external_message_id'),
    inReplyToMessageId: uuid('in_reply_to_message_id'),

    contentType: messageContentTypeEnum('content_type').notNull().default('text'),
    body: text('body').notNull(),
    bodyLocale: text('body_locale'),
    translationKo: text('translation_ko'), // Phase 3
    translationEn: text('translation_en'), // Phase 3 (for non-Korean staff)

    attachmentsJson: jsonb('attachments_json')
      .$type<
        Array<{
          path: string;
          mimeType: string;
          sizeBytes: number;
          previewUrl?: string;
          width?: number;
          height?: number;
          durationSeconds?: number;
        }>
      >()
      .notNull()
      .default(sql`'[]'::jsonb`),

    // AI-derived metadata. May be null for fresh messages.
    aiTone: aiToneEnum('ai_tone'),
    aiSentimentScore: integer('ai_sentiment_score'), // -100..100
    aiIntentClass: text('ai_intent_class'),
    aiRiskFlagsJson: jsonb('ai_risk_flags_json')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    aiExtractedEntitiesJson: jsonb('ai_extracted_entities_json')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    status: messageStatusEnum('status').notNull().default('sent'),
    failureReason: text('failure_reason'),

    isSeenByAgency: boolean('is_seen_by_agency').notNull().default(false),
    seenAt: timestamp('seen_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),

    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
  },
  (t) => ({
    convSentIdx: index('messages_conv_sent_idx').on(t.conversationId, t.sentAt),
    orgSentIdx: index('messages_org_sent_idx').on(t.organizationId, t.sentAt),
    externalUnique: uniqueIndex('messages_external_unique').on(
      t.conversationId,
      t.externalMessageId,
    ),
  }),
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

/**
 * quick_replies
 *
 * Per-organization library of canned responses. The body can be
 * multi-locale; we render whichever matches the conversation's locale,
 * falling back to KO.
 *
 * Triggered by typing `/<shortcut>` in the composer.
 */
export const quickReplies = pgTable(
  'quick_replies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    shortcut: text('shortcut').notNull(), // "/가격", "/예약"
    title: text('title').notNull(),
    bodyByLocale: jsonb('body_by_locale')
      .$type<Record<string, string | undefined>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    categoryKey: text('category_key'),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgShortcutUnique: uniqueIndex('quick_replies_org_shortcut_unique').on(
      t.organizationId,
      t.shortcut,
    ),
    orgIdx: index('quick_replies_org_idx').on(t.organizationId),
  }),
);

export type QuickReply = typeof quickReplies.$inferSelect;
export type NewQuickReply = typeof quickReplies.$inferInsert;

/**
 * glossary_terms
 *
 * Org-scoped medical-terminology dictionary. Used at translation time
 * (Phase 3) to enforce consistent renderings (e.g. "double eyelid" → "쌍꺼풀"
 * instead of "이중 눈꺼풀").
 */
export const glossaryTerms = pgTable(
  'glossary_terms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    sourceLocale: text('source_locale').notNull(),
    sourceText: text('source_text').notNull(),
    targetLocale: text('target_locale').notNull(),
    targetText: text('target_text').notNull(),
    notes: text('notes'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgPairUnique: uniqueIndex('glossary_terms_org_pair_unique').on(
      t.organizationId,
      t.sourceLocale,
      t.sourceText,
      t.targetLocale,
    ),
  }),
);

export type GlossaryTerm = typeof glossaryTerms.$inferSelect;
export type NewGlossaryTerm = typeof glossaryTerms.$inferInsert;
