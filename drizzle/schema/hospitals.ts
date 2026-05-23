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
import {
  depositCollectorEnum,
  depositTimingEnum,
  feeBaseEnum,
  feePackageRuleEnum,
  procedureCategoryEnum,
  vatTreatmentEnum,
} from './clinical-enums';

/**
 * hospitals
 *
 * Agency-side marketplace listing of partner hospitals. The same physical
 * hospital that has its own `medical` organization on the platform is linked
 * via `linkedOrgId`. Independent listings (small clinics that don't operate
 * the medical portal yet) have linkedOrgId = null.
 *
 * Each hospital row sits in the agency's organization scope — the same
 * partner hospital may be onboarded by multiple agencies independently.
 */
export const hospitals = pgTable(
  'hospitals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id') // the AGENCY org that owns this listing
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    linkedOrgId: uuid('linked_org_id').references(() => organizations.id, { onDelete: 'set null' }),

    name: text('name').notNull(),
    slug: text('slug').notNull(),
    legalName: text('legal_name'),
    licenseNumber: text('license_number'), // 개설신고증
    foreignPatientLicenseNumber: text('foreign_patient_license_number'),

    // Location / display
    countryCode: text('country_code').notNull().default('KR'),
    addressJson: jsonb('address_json')
      .$type<{ line1?: string; line2?: string; city?: string; state?: string; postalCode?: string }>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    latitude: text('latitude'),
    longitude: text('longitude'),

    // Categories supported by this hospital
    primaryCategories: jsonb('primary_categories')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    languagesSpoken: jsonb('languages_spoken')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    websiteUrl: text('website_url'),
    coverImageUrl: text('cover_image_url'),
    rating: integer('rating'), // 0..50 (= 0.0..5.0 × 10)
    reviewsCount: integer('reviews_count').notNull().default(0),

    /** Onboarding wizard fields */
    onboardingChecklist: jsonb('onboarding_checklist')
      .$type<{
        basics?: boolean;
        licenses?: boolean;
        referralPolicy?: boolean;
        depositPolicy?: boolean;
        chartWorkflow?: boolean;
        settlementCycle?: boolean;
        contractSigned?: boolean;
      }>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    /**
     * `isActiveForMatching` flips to true only once the checklist is complete
     * (lib/matching/hospital-matcher.ts enforces this in Phase 5). Until then,
     * the hospital cannot appear in patient-facing matches.
     */
    isActiveForMatching: boolean('is_active_for_matching').notNull().default(false),

    settlementCycle: text('settlement_cycle').notNull().default('monthly'), // 'weekly' | 'biweekly' | 'monthly'

    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgSlugUnique: uniqueIndex('hospitals_org_slug_unique').on(t.organizationId, t.slug),
    orgActiveIdx: index('hospitals_org_active_idx').on(t.organizationId, t.isActiveForMatching),
    linkedIdx: index('hospitals_linked_idx').on(t.linkedOrgId),
  }),
);

export type Hospital = typeof hospitals.$inferSelect;
export type NewHospital = typeof hospitals.$inferInsert;

export const hospitalDoctors = pgTable(
  'hospital_doctors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    hospitalId: uuid('hospital_id')
      .notNull()
      .references(() => hospitals.id, { onDelete: 'cascade' }),

    fullName: text('full_name').notNull(),
    title: text('title'), // "Prof.", "MD"
    specialty: text('specialty'),
    languagesSpoken: jsonb('languages_spoken').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    photoUrl: text('photo_url'),
    bio: text('bio'),
    licenseNumber: text('license_number'),
    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    hospitalIdx: index('hospital_doctors_hospital_idx').on(t.hospitalId, t.isActive),
  }),
);

/**
 * procedures_catalog
 *
 * Org-scoped master list of procedures, with i18n names + aliases used by
 * Treatment-Chart AI autofill to map a free-text line to a canonical
 * procedure id. `recovery_days` and `flight_restriction_days` feed the
 * package builder's conflict detector in Phase 5.
 */
export const proceduresCatalog = pgTable(
  'procedures_catalog',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    code: text('code').notNull(), // internal stable code
    category: procedureCategoryEnum('category').notNull(),
    nameI18nJson: jsonb('name_i18n_json')
      .$type<Record<string, string | undefined>>() // locale → display (partial OK)
      .notNull()
      .default(sql`'{}'::jsonb`),
    aliasesJson: jsonb('aliases_json')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    vatTreatment: vatTreatmentEnum('vat_treatment').notNull().default('taxable'),
    recoveryDays: integer('recovery_days').notNull().default(7),
    flightRestrictionDays: integer('flight_restriction_days').notNull().default(7),
    constraintsJson: jsonb('constraints_json')
      .$type<{
        avoidSauna?: number;
        avoidUv?: number;
        avoidAlcohol?: number;
        avoidIntenseExercise?: number;
      }>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    typicalPriceKrwMin: integer('typical_price_krw_min'),
    typicalPriceKrwMax: integer('typical_price_krw_max'),

    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgCodeUnique: uniqueIndex('procedures_org_code_unique').on(t.organizationId, t.code),
    orgCategoryIdx: index('procedures_org_category_idx').on(t.organizationId, t.category),
  }),
);

export type ProcedureCatalogRow = typeof proceduresCatalog.$inferSelect;
export type NewProcedureCatalogRow = typeof proceduresCatalog.$inferInsert;

/**
 * hospital_term_aliases
 *
 * Per-hospital learned aliases ("our 'Nose plus'" → procedure code RHIN_BAS).
 * Populated by the AI chart-autofill feedback loop; private to each hospital.
 */
export const hospitalTermAliases = pgTable(
  'hospital_term_aliases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    hospitalId: uuid('hospital_id')
      .notNull()
      .references(() => hospitals.id, { onDelete: 'cascade' }),
    procedureCatalogId: uuid('procedure_catalog_id')
      .notNull()
      .references(() => proceduresCatalog.id, { onDelete: 'cascade' }),
    alias: text('alias').notNull(),
    learnedFromFeedback: boolean('learned_from_feedback').notNull().default(false),
    confidenceBp: integer('confidence_bp').notNull().default(8000),
    usageCount: integer('usage_count').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    hospitalAliasUnique: uniqueIndex('hospital_term_aliases_unique').on(t.hospitalId, t.alias),
    hospitalIdx: index('hospital_term_aliases_hospital_idx').on(t.hospitalId),
  }),
);

/**
 * hospital_referral_rates
 *
 * The agency's per-hospital referral-fee policy. Either at the category
 * level (e.g. plastic_surgery = 30%) or overriding by procedure_code.
 * The active rule for a given chart line is resolved by
 * `lib/pricing/policy-resolver.ts` (Phase 6 fills the actual computation).
 */
export const hospitalReferralRates = pgTable(
  'hospital_referral_rates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    hospitalId: uuid('hospital_id')
      .notNull()
      .references(() => hospitals.id, { onDelete: 'cascade' }),

    /** When null + procedure_code null = the hospital default. */
    category: procedureCategoryEnum('category'),
    procedureCode: text('procedure_code'),

    /** Basis-points × 100 — e.g. 3000 = 30.00%. */
    rateBp: integer('rate_bp').notNull(),
    feeBase: feeBaseEnum('fee_base').notNull().default('net_excl_vat'),
    packageRule: feePackageRuleEnum('package_rule').notNull().default('sum_per_item'),
    vatTreatment: vatTreatmentEnum('vat_treatment').notNull().default('exempt'),

    /** Optional escalators / floors */
    vipRateBp: integer('vip_rate_bp'),
    repeatRateBp: integer('repeat_rate_bp'),
    minimumGuaranteeKrw: integer('minimum_guarantee_krw'),
    progressiveRulesJson: jsonb('progressive_rules_json')
      .$type<Array<{ thresholdCount: number; bonusBp: number }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    includePatientDirectPayment: boolean('include_patient_direct_payment').notNull().default(false),
    payoutTrigger: text('payout_trigger').notNull().default('on_treatment_done'),
    payoutHoldDays: integer('payout_hold_days').notNull().default(0),

    contractPdfUrl: text('contract_pdf_url'),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }),
    effectiveUntil: timestamp('effective_until', { withTimezone: true }),

    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    hospitalCategoryIdx: index('hospital_referral_rates_h_cat_idx').on(t.hospitalId, t.category),
    hospitalProcedureUnique: uniqueIndex('hospital_referral_rates_h_proc_unique').on(
      t.hospitalId,
      t.procedureCode,
    ),
  }),
);

export type HospitalReferralRate = typeof hospitalReferralRates.$inferSelect;
export type NewHospitalReferralRate = typeof hospitalReferralRates.$inferInsert;

/**
 * hospital_deposit_policies
 *
 * Per-hospital deposit rules. Phase 6 wires this to the deposit engine
 * (deposit reminders, reconciliation, refunds, no-show penalties).
 */
export const hospitalDepositPolicies = pgTable(
  'hospital_deposit_policies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    hospitalId: uuid('hospital_id')
      .notNull()
      .references(() => hospitals.id, { onDelete: 'cascade' }),

    isEnabled: boolean('is_enabled').notNull().default(true),
    /** Either a fixed amount OR a percentage of quote total — not both. */
    fixedAmountKrw: integer('fixed_amount_krw'),
    percentageBp: integer('percentage_bp'),

    perProcedureOverridesJson: jsonb('per_procedure_overrides_json')
      .$type<Array<{ procedureCode: string; fixedAmountKrw?: number; percentageBp?: number }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    collector: depositCollectorEnum('collector').notNull().default('agency_collects'),
    timing: depositTimingEnum('timing').notNull().default('on_quote_accepted'),
    daysBeforeVisit: integer('days_before_visit').notNull().default(7),

    /** Refund tiers — each entry: { daysBeforeVisitMin, refundBp } */
    refundTiersJson: jsonb('refund_tiers_json')
      .$type<Array<{ daysBeforeVisitMin: number; refundBp: number }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    medicalCauseFullRefund: boolean('medical_cause_full_refund').notNull().default(true),
    forceMajeureFullRefund: boolean('force_majeure_full_refund').notNull().default(true),

    includeInReferralBase: boolean('include_in_referral_base').notNull().default(true),

    cancellationSplitJson: jsonb('cancellation_split_json')
      .$type<{ hospitalBp: number; agencyBp: number; patientRefundBp: number }>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    autoRemindersJson: jsonb('auto_reminders_json')
      .$type<Array<{ offsetDays: number; channelKinds: string[] }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    autoCancelOnUnpaidHours: integer('auto_cancel_on_unpaid_hours'),

    contractPdfUrl: text('contract_pdf_url'),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }),
    effectiveUntil: timestamp('effective_until', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    hospitalUnique: uniqueIndex('hospital_deposit_policies_hospital_unique').on(t.hospitalId),
  }),
);

export type HospitalDepositPolicy = typeof hospitalDepositPolicies.$inferSelect;
export type NewHospitalDepositPolicy = typeof hospitalDepositPolicies.$inferInsert;
