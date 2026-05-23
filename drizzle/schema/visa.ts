import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';
import { patients } from './patients';
import { cases } from './cases';
import { hospitals } from './hospitals';

/**
 * Phase 7 — Korean medical-tourism visa flow.
 *
 * Two main categories per 출입국관리법:
 *   C-3-3 — 단기 의료관광 (≤90일, 일반 진료·미용·검진)
 *   G-1-10 — 의료관광 보호자 (환자 동반자, ≤1년 연장 가능)
 *
 * We don't *issue* the visa — only generate the hospital invitation letter
 * (초청장) that the patient submits to a Korean embassy / consulate, and
 * track the application status returned by 외교부 / 출입국·외국인청.
 */

export const visaCategoryEnum = pgEnum('visa_category', [
  'C_3_3', // 단기 의료관광
  'G_1_10', // 의료관광 보호자 (companion)
  'C_3_9', // 단기 일반
  'E_6', // 의료기술 연수 (rare)
  'other',
]);

export const visaRequestStatusEnum = pgEnum('visa_request_status', [
  'drafting', // invitation letter being prepared
  'invitation_issued', // hospital signed; ready for patient submission
  'submitted', // patient applied at consulate
  'approved',
  'rejected',
  'cancelled',
  'expired',
]);

/**
 * One row per visa application attempt. A patient may have multiple
 * (re-applications, switching from C-3-3 to G-1-10 mid-treatment, …).
 */
export const visaRequests = pgTable(
  'visa_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
    inviterHospitalId: uuid('inviter_hospital_id').references(() => hospitals.id, {
      onDelete: 'set null',
    }),

    category: visaCategoryEnum('category').notNull(),
    status: visaRequestStatusEnum('status').notNull().default('drafting'),

    /** Embassy / consulate where the patient will submit. ISO country + city. */
    consulateCountryCode: text('consulate_country_code'),
    consulateCity: text('consulate_city'),

    intendedEntryDate: text('intended_entry_date'), // YYYY-MM-DD
    intendedExitDate: text('intended_exit_date'), // YYYY-MM-DD
    durationDays: integer('duration_days'),

    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    decisionAt: timestamp('decision_at', { withTimezone: true }),
    decisionReason: text('decision_reason'),

    /** Snapshot of the invitation letter PDF path + sha256. */
    invitationLetterStoragePath: text('invitation_letter_storage_path'),
    invitationLetterSha256: text('invitation_letter_sha256'),

    /** Supporting docs uploaded by the patient / hospital. */
    attachmentsJson: jsonb('attachments_json')
      .$type<Array<{ kind: string; storagePath: string; sha256?: string; uploadedAt: string }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    /** Free-form notes from the case manager. */
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => ({
    orgPatientIdx: index('visa_requests_org_patient_idx').on(t.organizationId, t.patientId),
    statusIdx: index('visa_requests_status_idx').on(t.organizationId, t.status),
  }),
);

export type VisaRequest = typeof visaRequests.$inferSelect;
export type NewVisaRequest = typeof visaRequests.$inferInsert;

/**
 * Per-version invitation letter content (so re-issuances are auditable).
 * The PDF is rendered server-side; only the rendered version's storage path
 * + the input data live here.
 */
export const visaInvitations = pgTable(
  'visa_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    visaRequestId: uuid('visa_request_id')
      .notNull()
      .references(() => visaRequests.id, { onDelete: 'cascade' }),

    versionNumber: integer('version_number').notNull().default(1),

    /** Frozen content used to render the PDF (read at audit time). */
    contentJson: jsonb('content_json')
      .$type<{
        category: string;
        patientName: string;
        passportNumber: string;
        nationality: string;
        dateOfBirth: string;
        sex: string;
        hospitalName: string;
        hospitalLicenseNumber: string;
        hospitalAddress: string;
        hospitalPhone: string;
        representativeName: string;
        agencyName: string;
        agencyForeignPatientLicense: string;
        intendedEntryDate: string;
        intendedExitDate: string;
        durationDays: number;
        treatmentSummary: string;
        companions?: Array<{ name: string; relation: string; passportNumber: string }>;
        issuedDate: string;
      }>()
      .notNull(),

    storagePath: text('storage_path'),
    sha256: text('sha256'),
    sentToEmbassyAt: timestamp('sent_to_embassy_at', { withTimezone: true }),
    issuedByUserId: uuid('issued_by_user_id').references(() => users.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    versionUnique: uniqueIndex('visa_invitations_request_version_unique').on(t.visaRequestId, t.versionNumber),
  }),
);

export type VisaInvitation = typeof visaInvitations.$inferSelect;
