import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';
import { patientSexEnum, patientStatusEnum } from './clinical-enums';

/**
 * patients
 *
 * Agency-owned record. We deliberately keep highly sensitive PII fields as
 * encrypted blobs (pgp_sym_encrypt) so a database leak alone can't surface
 * passport numbers or RRNs. Drizzle still selects the encrypted bytes; the
 * decryption helpers in lib/encryption/pgcrypto.ts unwrap them in app code
 * when explicitly requested.
 *
 * Non-medical / freelancer organizations can only see this table via the
 * `freelancer_affiliations.pii_visibility` gate — RLS in 40_clinical.sql.
 */
export const patients = pgTable(
  'patients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    // ── Display (non-sensitive) ────────────────────────────────────
    aliasName: text('alias_name'), // e.g. "Ms. Wang (Beijing)" — safe for non-medical staff
    fullName: text('full_name').notNull(), // Agency-side viewable
    surname: text('surname'),
    givenNames: text('given_names'),
    nationality: text('nationality'), // ISO-3166 alpha-3
    countryCode: text('country_code'), // residence country
    locale: text('locale'),
    timezone: text('timezone'),
    sex: patientSexEnum('sex').notNull().default('unknown'),
    dateOfBirth: text('date_of_birth'), // YYYY-MM-DD (non-encrypted — needed for age/eligibility)

    // ── Sensitive (encrypted bytea blobs, base64-encoded text for portability) ──
    passportNumberEncrypted: text('passport_number_encrypted'),
    rrnEncrypted: text('rrn_encrypted'), // 외국인등록번호 / 주민번호
    phoneEncrypted: text('phone_encrypted'),
    emailEncrypted: text('email_encrypted'),
    insuranceCardEncrypted: text('insurance_card_encrypted'),

    // ── Display fingerprints (cheap deduplication) ─────────────────
    phoneHash: text('phone_hash'),
    emailHash: text('email_hash'),
    passportHash: text('passport_hash'),

    // ── Travel / billing ──────────────────────────────────────────
    preferredCurrency: text('preferred_currency').default('KRW'),
    preferredChannelKind: text('preferred_channel_kind'),
    avatarUrl: text('avatar_url'),

    // ── Patient PWA bootstrap ─────────────────────────────────────
    patientPortalToken: text('patient_portal_token'),
    patientPortalLastSeenAt: timestamp('patient_portal_last_seen_at', { withTimezone: true }),

    // ── Lifecycle ─────────────────────────────────────────────────
    status: patientStatusEnum('status').notNull().default('active'),
    mergedIntoId: uuid('merged_into_id'),

    // ── Source / tags / extracted entities ────────────────────────
    sourceChannel: text('source_channel'), // e.g. "instagram"
    sourceCampaign: text('source_campaign'),
    sourceConversationId: uuid('source_conversation_id'),
    tagsJson: jsonb('tags_json').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    // PHI access audit pointer (last viewer; full log in audit_logs).
    lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
    lastViewedById: uuid('last_viewed_by_id').references(() => users.id, { onDelete: 'set null' }),

    // ── Consents (Phase 7) ────────────────────────────────────────
    consentMedicalAt: timestamp('consent_medical_at', { withTimezone: true }),
    consentOverseasTransferAt: timestamp('consent_overseas_transfer_at', { withTimezone: true }),
    consentMarketingAt: timestamp('consent_marketing_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => ({
    orgStatusIdx: index('patients_org_status_idx').on(t.organizationId, t.status),
    orgNameIdx: index('patients_org_name_idx').on(t.organizationId, t.fullName),
    phoneHashIdx: index('patients_phone_hash_idx').on(t.phoneHash),
    emailHashIdx: index('patients_email_hash_idx').on(t.emailHash),
    passportHashIdx: index('patients_passport_hash_idx').on(t.passportHash),
    sourceConvUnique: uniqueIndex('patients_source_conversation_unique').on(
      t.organizationId,
      t.sourceConversationId,
    ),
  }),
);

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;

/**
 * patient_medical_history
 *
 * Append-only per-patient history items: allergies, current medications,
 * past procedures, pregnancy, breastfeeding, comorbidities, etc.
 * Each row is small and self-contained → easy to redact selectively.
 */
export const patientMedicalHistory = pgTable(
  'patient_medical_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),

    category: text('category').notNull(), // 'allergy' | 'medication' | 'condition' | 'past_procedure' | 'pregnancy' | 'note'
    severity: text('severity'), // 'mild' | 'moderate' | 'severe'
    description: text('description').notNull(),
    onsetDate: text('onset_date'), // YYYY-MM-DD
    isActive: boolean('is_active').notNull().default(true),

    extraJson: jsonb('extra_json')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => ({
    patientIdx: index('patient_history_patient_idx').on(t.patientId),
    categoryIdx: index('patient_history_category_idx').on(t.patientId, t.category),
  }),
);

export type PatientMedicalHistoryRow = typeof patientMedicalHistory.$inferSelect;
export type NewPatientMedicalHistory = typeof patientMedicalHistory.$inferInsert;

/**
 * patient_tags catalog (org-scoped). A patient may have many tags;
 * stored as text array on the patient for fast list views, and here for
 * the management UI.
 */
export const patientTagsCatalog = pgTable(
  'patient_tags_catalog',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    color: text('color').notNull().default('#94a3b8'),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgLabelUnique: uniqueIndex('patient_tags_org_label_unique').on(t.organizationId, t.label),
  }),
);
