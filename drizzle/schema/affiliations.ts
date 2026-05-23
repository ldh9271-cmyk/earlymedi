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
import { piiVisibilityEnum } from './enums';

/**
 * freelancer_affiliations
 *
 * Explicit M:N link between Agency orgs and Freelancer orgs.
 * Carries the contract terms (referral code, PII visibility, commission policy).
 *
 * Freelancers can ONLY see case data if a row exists here AND status='active'.
 * The pii_visibility column is the system's authoritative gate for PII leakage —
 * any read of patient data from /freelancer/* must pass this check.
 */
export const freelancerAffiliations = pgTable(
  'freelancer_affiliations',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    agencyOrgId: uuid('agency_org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    freelancerOrgId: uuid('freelancer_org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    referralCode: text('referral_code').notNull(), // unique short code per affiliation
    piiVisibility: piiVisibilityEnum('pii_visibility').notNull().default('none'),

    // Default commission policy at the affiliation level; overrides cascade through
    // policy-resolver (lib/pricing/policy-resolver.ts). Stored as snapshot blob,
    // not normalized — the rule engine is in code.
    commissionPolicyJson: jsonb('commission_policy_json')
      .$type<{
        calc_type: 'percent_of_revenue' | 'percent_of_margin' | 'fixed_amount' | 'tiered';
        base: 'patient_paid' | 'hospital_quote' | 'net_margin' | 'hospital_referral_fee' | 'agency_net_after_costs';
        rate_bp?: number; // basis points × 100 (e.g. 1000 = 10.00%)
        fixed_amount_minor?: number;
        tier_rules?: Array<{ threshold: number; rate_bp: number }>;
        vat_treatment?: 'inclusive' | 'exclusive' | 'separate';
        withholding_tax_bp?: number;
        payout_trigger?: 'on_payment' | 'on_treatment_done' | 'on_discharge' | 'on_recovery_d7' | 'on_recovery_d30';
        payout_hold_days?: number;
      } | null>()
      .default(sql`null`),

    // Contract & lifecycle
    contractPdfUrl: text('contract_pdf_url'),
    contractSignedAt: timestamp('contract_signed_at', { withTimezone: true }),
    monthlyCaseCap: integer('monthly_case_cap'), // null = unlimited
    isActive: boolean('is_active').notNull().default(true),
    terminatedAt: timestamp('terminated_at', { withTimezone: true }),
    terminatedReason: text('terminated_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pairUnique: uniqueIndex('freelancer_affiliations_pair_unique').on(
      t.agencyOrgId,
      t.freelancerOrgId,
    ),
    referralCodeUnique: uniqueIndex('freelancer_affiliations_referral_code_unique').on(
      t.referralCode,
    ),
    agencyActiveIdx: index('freelancer_affiliations_agency_active_idx').on(
      t.agencyOrgId,
      t.isActive,
    ),
    freelancerActiveIdx: index('freelancer_affiliations_freelancer_active_idx').on(
      t.freelancerOrgId,
      t.isActive,
    ),
  }),
);

export type FreelancerAffiliation = typeof freelancerAffiliations.$inferSelect;
export type NewFreelancerAffiliation = typeof freelancerAffiliations.$inferInsert;
