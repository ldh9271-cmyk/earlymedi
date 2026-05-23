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
import {
  accountTypeEnum,
  orgVerificationStatusEnum,
  partnerSubtypeEnum,
} from './enums';

/**
 * organizations
 *
 * The single source of truth for any tenant in the system.
 * The account_type determines URL prefix, RLS slice, and which routes the
 * 5-step middleware allows.
 *
 * - account_type = 'agency'       → /agency/*
 * - account_type = 'freelancer'   → /freelancer/*
 * - account_type = 'medical'      → /medical/*
 * - account_type = 'non_medical'  → /partner/*
 */
export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountType: accountTypeEnum('account_type').notNull(),
    partnerSubtype: partnerSubtypeEnum('partner_subtype'), // only when account_type='non_medical'

    // Display
    name: text('name').notNull(),
    legalName: text('legal_name'),
    slug: text('slug').notNull(), // URL slug, unique
    countryCode: text('country_code').notNull().default('KR'),
    timezone: text('timezone').notNull().default('Asia/Seoul'),
    defaultLocale: text('default_locale').notNull().default('ko'),
    defaultCurrency: text('default_currency').notNull().default('KRW'),

    // KR regulatory identifiers
    businessRegistrationNumber: text('business_registration_number'), // 사업자등록번호
    foreignPatientLicenseNumber: text('foreign_patient_license_number'), // 외국인환자 유치업 등록증
    medicalLicenseNumber: text('medical_license_number'), // 의료기관 개설신고증
    representativeName: text('representative_name'),

    // Documents uploaded during signup wizard
    // Shape: { businessReg: { url, uploadedAt, verified }, foreignPatientLicense: {...}, ... }
    verificationDocuments: jsonb('verification_documents')
      .$type<Record<string, { url: string; uploadedAt: string; verified: boolean }>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    verificationStatus: orgVerificationStatusEnum('verification_status')
      .notNull()
      .default('unverified'),
    verificationNotes: text('verification_notes'),

    // White-label / branding (Phase 10)
    brandingJson: jsonb('branding_json')
      .$type<{
        logoUrl?: string;
        primaryColor?: string;
        accentColor?: string;
        customDomain?: string;
        emailFromName?: string;
      }>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    // Lifecycle
    isActive: boolean('is_active').notNull().default(true),
    onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    suspendedReason: text('suspended_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUnique: uniqueIndex('organizations_slug_unique').on(t.slug),
    accountTypeIdx: index('organizations_account_type_idx').on(t.accountType),
    verificationStatusIdx: index('organizations_verification_status_idx').on(t.verificationStatus),
    countryIdx: index('organizations_country_idx').on(t.countryCode),
  }),
);

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
