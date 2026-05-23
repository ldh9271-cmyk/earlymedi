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
import { hospitals } from './hospitals';
import { patients } from './patients';
import {
  treatmentChartItemKindEnum,
  treatmentChartShareLevelEnum,
  treatmentChartStatusEnum,
  vatTreatmentEnum,
} from './clinical-enums';

/**
 * treatment_charts
 *
 * The 1st-class record that anchors all post-treatment settlement. Lives at
 * the AGENCY org scope (organizationId) but is created by the HOSPITAL and
 * countersigned by the AGENCY (3-way workflow → patient).
 *
 * Versioning rule: once `finalized_at` is set, this row is immutable. A
 * superseding chart is created with `supersedesId` pointing back here.
 *
 * Hospitals that operate the `/medical/*` portal write to this table via RLS
 * cross-org visibility (see drizzle/rls/40_clinical.sql).
 */
export const treatmentCharts = pgTable(
  'treatment_charts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }), // owning AGENCY
    hospitalId: uuid('hospital_id')
      .notNull()
      .references(() => hospitals.id, { onDelete: 'restrict' }),
    hospitalOrgId: uuid('hospital_org_id').references(() => organizations.id, {
      onDelete: 'set null',
    }), // the medical org if linked
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    caseId: uuid('case_id'), // Phase 5

    versionNumber: integer('version_number').notNull().default(1),
    supersedesId: uuid('supersedes_id'),

    status: treatmentChartStatusEnum('status').notNull().default('draft'),
    shareLevel: treatmentChartShareLevelEnum('share_level')
      .notNull()
      .default('name_and_amount'),

    treatmentDate: text('treatment_date').notNull(), // YYYY-MM-DD
    doctorName: text('doctor_name'),
    notes: text('notes'),

    // Aggregate totals (KRW minor units) — recomputed from items on save
    subtotalKrw: integer('subtotal_krw').notNull().default(0),
    discountTotalKrw: integer('discount_total_krw').notNull().default(0),
    vatTotalKrw: integer('vat_total_krw').notNull().default(0),
    grandTotalKrw: integer('grand_total_krw').notNull().default(0),
    depositReceivedKrw: integer('deposit_received_krw').notNull().default(0),
    patientBalanceKrw: integer('patient_balance_krw').notNull().default(0),
    currency: text('currency').notNull().default('KRW'),
    fxSnapshotJson: jsonb('fx_snapshot_json')
      .$type<{ rateKrwPer: Record<string, number> } | null>()
      .default(sql`null`),

    vatTreatment: vatTreatmentEnum('vat_treatment').notNull().default('mixed'),

    /** Snapshot of the active referral-fee policy at finalize time. */
    referralPolicySnapshotJson: jsonb('referral_policy_snapshot_json')
      .$type<Record<string, unknown> | null>()
      .default(sql`null`),
    /** Computed referral-fee total for the chart. */
    referralFeeTotalKrw: integer('referral_fee_total_krw'),

    /** Quote → chart variance check. */
    quoteId: uuid('quote_id'),
    quoteTotalKrw: integer('quote_total_krw'),
    quoteVarianceBp: integer('quote_variance_bp'), // (chart-quote)/quote × 10000
    quoteVarianceFlag: text('quote_variance_flag'), // 'auto' | 'manager' | 'patient_reconsent'

    aiExtractionJobId: uuid('ai_extraction_job_id'), // ai_extraction_jobs.id when filled by AI

    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    agencyApprovedAt: timestamp('agency_approved_at', { withTimezone: true }),
    agencyApprovedById: uuid('agency_approved_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    patientSharedAt: timestamp('patient_shared_at', { withTimezone: true }),
    finalizedAt: timestamp('finalized_at', { withTimezone: true }),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidedReason: text('voided_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  (t) => ({
    orgStatusIdx: index('treatment_charts_org_status_idx').on(t.organizationId, t.status),
    hospitalIdx: index('treatment_charts_hospital_idx').on(t.hospitalId, t.status),
    patientIdx: index('treatment_charts_patient_idx').on(t.patientId, t.versionNumber),
    finalizedIdx: index('treatment_charts_finalized_idx').on(t.organizationId, t.finalizedAt),
  }),
);

export type TreatmentChart = typeof treatmentCharts.$inferSelect;
export type NewTreatmentChart = typeof treatmentCharts.$inferInsert;

/**
 * treatment_chart_items
 *
 * Per-line breakdown. Each item has the AI confidence and which procedure
 * it mapped to, so the agency reviewer sees green/amber/red dots inline.
 */
export const treatmentChartItems = pgTable(
  'treatment_chart_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    chartId: uuid('chart_id')
      .notNull()
      .references(() => treatmentCharts.id, { onDelete: 'cascade' }),

    lineNumber: integer('line_number').notNull(),
    itemKind: treatmentChartItemKindEnum('item_kind').notNull().default('procedure'),

    rawText: text('raw_text'),
    procedureNameNormalized: text('procedure_name_normalized').notNull(),
    procedureCatalogId: uuid('procedure_catalog_id'),
    procedureCode: text('procedure_code'),
    bodyPart: text('body_part'),

    quantity: integer('quantity').notNull().default(1),
    unitPriceKrw: integer('unit_price_krw').notNull().default(0),
    lineTotalKrw: integer('line_total_krw').notNull().default(0),

    vatIncluded: boolean('vat_included').notNull().default(false),
    vatRateBp: integer('vat_rate_bp').notNull().default(1000),
    vatTreatment: vatTreatmentEnum('vat_treatment').notNull().default('taxable'),

    isAddon: boolean('is_addon').notNull().default(false),
    discountKrw: integer('discount_krw').notNull().default(0),
    confidenceBp: integer('confidence_bp').notNull().default(10_000),

    aiNotes: text('ai_notes'),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
  },
  (t) => ({
    chartLineIdx: index('treatment_chart_items_chart_line_idx').on(t.chartId, t.lineNumber),
    procedureCatalogIdx: index('treatment_chart_items_proc_catalog_idx').on(t.procedureCatalogId),
  }),
);

export type TreatmentChartItem = typeof treatmentChartItems.$inferSelect;
export type NewTreatmentChartItem = typeof treatmentChartItems.$inferInsert;

/**
 * treatment_chart_revisions
 *
 * Diff log between versions / between hospital submission and agency
 * changes. Append-only.
 */
export const treatmentChartRevisions = pgTable(
  'treatment_chart_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    chartId: uuid('chart_id')
      .notNull()
      .references(() => treatmentCharts.id, { onDelete: 'cascade' }),

    fromStatus: text('from_status'),
    toStatus: text('to_status').notNull(),
    actorRole: text('actor_role').notNull(), // 'hospital' | 'agency' | 'system' | 'ai'
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),

    summary: text('summary'),
    diffJson: jsonb('diff_json')
      .$type<Record<string, { before: unknown; after: unknown }>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    chartIdx: index('treatment_chart_revisions_chart_idx').on(t.chartId, t.createdAt),
  }),
);

export type TreatmentChartRevision = typeof treatmentChartRevisions.$inferSelect;

/**
 * treatment_chart_attachments
 *
 * Supporting documents (photos, scanned PDFs, voice notes) attached during
 * AI autofill or by the hospital. Storage paths only.
 */
export const treatmentChartAttachments = pgTable(
  'treatment_chart_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    chartId: uuid('chart_id')
      .notNull()
      .references(() => treatmentCharts.id, { onDelete: 'cascade' }),

    storagePath: text('storage_path').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    purpose: text('purpose'), // 'autofill_source' | 'evidence' | 'consent_form'
    aiExtractionJobId: uuid('ai_extraction_job_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  (t) => ({
    chartIdx: index('treatment_chart_attachments_chart_idx').on(t.chartId),
  }),
);

/**
 * treatment_chart_approvals
 *
 * Tracks each side's e-signature on a chart version (hospital, agency,
 * patient). When all required signatures land + status='finalized', the
 * settlement pipeline in Phase 6 picks it up via the bridge.
 */
export const treatmentChartApprovals = pgTable(
  'treatment_chart_approvals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    chartId: uuid('chart_id')
      .notNull()
      .references(() => treatmentCharts.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'hospital' | 'agency' | 'patient'
    signerUserId: uuid('signer_user_id').references(() => users.id, { onDelete: 'set null' }),
    signerName: text('signer_name'),
    signedAt: timestamp('signed_at', { withTimezone: true }).notNull().defaultNow(),
    signatureIp: text('signature_ip'),
    note: text('note'),
  },
  (t) => ({
    chartRoleUnique: uniqueIndex('treatment_chart_approvals_chart_role_unique').on(
      t.chartId,
      t.role,
    ),
  }),
);
