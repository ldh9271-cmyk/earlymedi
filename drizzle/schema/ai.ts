import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

/**
 * Phase 3 — AI metadata tables.
 *
 *   - ai_usage_logs            every model invocation (for billing + analytics)
 *   - ai_anonymization_tokens  PII placeholders <-> real values, short-lived
 *   - ai_extraction_jobs       structured-output jobs (passport/chart/ticket…)
 *   - ai_extraction_feedback   thumbs-up/correction events → trains aliases
 *
 * Each row is org-scoped; RLS in drizzle/rls/30_ai.sql enforces isolation.
 */

export const aiProviderEnum = pgEnum('ai_provider', ['gemini', 'claude', 'openai', 'gcv', 'tesseract']);
export const aiCallKindEnum = pgEnum('ai_call_kind', [
  'chat',
  'translate',
  'summarize',
  'classify',
  'extract',
  'vision_ocr',
  'speech_to_text',
  'embedding',
  'safety_classifier',
]);

export const aiUsageLogs = pgTable(
  'ai_usage_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),

    kind: aiCallKindEnum('kind').notNull(),
    provider: aiProviderEnum('provider').notNull(),
    model: text('model').notNull(), // e.g. "gemini-2.5-pro"

    // Resource entity that triggered the call (conversation, chart, …)
    entityType: text('entity_type'),
    entityId: text('entity_id'),

    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    cachedInputTokens: integer('cached_input_tokens').notNull().default(0),
    visionImages: integer('vision_images').notNull().default(0),
    audioSeconds: integer('audio_seconds').notNull().default(0),
    latencyMs: integer('latency_ms').notNull().default(0),

    isFallback: boolean('is_fallback').notNull().default(false),
    fellBackFrom: text('fell_back_from'),
    failed: boolean('failed').notNull().default(false),
    errorCode: text('error_code'),

    // Cost snapshot (KRW minor units) so analytics doesn't have to re-price.
    estimatedCostKrw: integer('estimated_cost_krw').notNull().default(0),

    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgKindIdx: index('ai_usage_org_kind_idx').on(t.organizationId, t.kind, t.createdAt),
    orgCreatedIdx: index('ai_usage_org_created_idx').on(t.organizationId, t.createdAt),
  }),
);

export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
export type NewAiUsageLog = typeof aiUsageLogs.$inferInsert;

export const aiAnonymizationTokens = pgTable(
  'ai_anonymization_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    /** Job-scoped batch id (one batch ~ one AI request). */
    jobToken: text('job_token').notNull(),
    /** Placeholder rendered into the AI prompt, e.g. `[[NAME_1]]`. */
    placeholder: text('placeholder').notNull(),
    /** Encrypted original PII value. NEVER stored plaintext. */
    originalEncrypted: text('original_encrypted').notNull(),
    /** Category of PII (name, phone, passport, address, dob, …) for audit. */
    piiKind: text('pii_kind').notNull(),

    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgJobIdx: index('ai_anon_org_job_idx').on(t.organizationId, t.jobToken),
    expiresIdx: index('ai_anon_expires_idx').on(t.expiresAt),
  }),
);

export type AiAnonymizationToken = typeof aiAnonymizationTokens.$inferSelect;
export type NewAiAnonymizationToken = typeof aiAnonymizationTokens.$inferInsert;

export const aiExtractionStatusEnum = pgEnum('ai_extraction_status', [
  'queued',
  'preprocessing',
  'ocr',
  'vision',
  'structuring',
  'validating',
  'review_required', // mid-confidence → human review
  'completed',
  'failed',
]);

export const aiExtractionSchemaEnum = pgEnum('ai_extraction_schema', [
  'passport',
  'id_card',
  'flight_ticket',
  'external_quote',
  'medical_record',
  'menu',
  'treatment_chart', // populated in Phase 4
  'message_intent',
  'generic',
]);

export const aiExtractionJobs = pgTable(
  'ai_extraction_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),

    schemaKey: aiExtractionSchemaEnum('schema_key').notNull(),
    status: aiExtractionStatusEnum('status').notNull().default('queued'),

    inputKind: text('input_kind').notNull(), // "image" | "pdf" | "text" | "audio" | "messenger"
    inputRefs: jsonb('input_refs')
      .$type<Array<{ storagePath?: string; url?: string; text?: string; mimeType?: string }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    // Cached intermediate stages so retries don't re-OCR.
    ocrTextHash: text('ocr_text_hash'),
    ocrText: text('ocr_text'),
    visionRaw: jsonb('vision_raw').$type<Record<string, unknown> | null>().default(sql`null`),

    /** Final structured output validated against the zod schema. */
    extractedJson: jsonb('extracted_json')
      .$type<Record<string, unknown> | null>()
      .default(sql`null`),
    /** Per-field confidence in basis points × 100 (e.g. 9200 = 92.00%). */
    confidenceJson: jsonb('confidence_json')
      .$type<Record<string, number> | null>()
      .default(sql`null`),
    overallConfidenceBp: integer('overall_confidence_bp'),

    warningsJson: jsonb('warnings_json')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    primaryModel: text('primary_model'),
    fallbackUsed: boolean('fallback_used').notNull().default(false),
    failureReason: text('failure_reason'),

    // Audit pointer: which entity does this feed into?
    boundEntityType: text('bound_entity_type'),
    boundEntityId: text('bound_entity_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => ({
    orgSchemaIdx: index('ai_extraction_org_schema_idx').on(t.organizationId, t.schemaKey),
    orgStatusIdx: index('ai_extraction_org_status_idx').on(t.organizationId, t.status),
    boundIdx: index('ai_extraction_bound_idx').on(t.boundEntityType, t.boundEntityId),
  }),
);

export type AiExtractionJob = typeof aiExtractionJobs.$inferSelect;
export type NewAiExtractionJob = typeof aiExtractionJobs.$inferInsert;

export const aiExtractionFeedback = pgTable(
  'ai_extraction_feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => aiExtractionJobs.id, { onDelete: 'cascade' }),
    fieldKey: text('field_key').notNull(),
    originalValue: text('original_value'),
    correctedValue: text('corrected_value').notNull(),
    correctedByUserId: uuid('corrected_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    appliedToAliases: boolean('applied_to_aliases').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgJobIdx: index('ai_feedback_org_job_idx').on(t.organizationId, t.jobId),
  }),
);

export type AiExtractionFeedback = typeof aiExtractionFeedback.$inferSelect;
export type NewAiExtractionFeedback = typeof aiExtractionFeedback.$inferInsert;
