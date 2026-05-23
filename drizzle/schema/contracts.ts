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

/**
 * partner_contracts
 *
 * Explicit M:N link between Agency orgs and (Medical | Non-medical) partner orgs.
 * One row per (agency_org, partner_org) pair. Holds:
 *  - referral_rate_policy (병원 송객 수수료 — Phase 4 fills detail)
 *  - deposit_policy       (예약금)
 *  - commission_policy    (분배)
 *  - contract metadata + e-signature
 *
 * Carries a `status` column that other tables key on; if a contract is not
 * active, the partner cannot appear in marketplace listings or be matched.
 *
 * Phase 1 stores only the contract envelope. Phase 4 fills the policy details.
 */
export const partnerContracts = pgTable(
  'partner_contracts',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    agencyOrgId: uuid('agency_org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    partnerOrgId: uuid('partner_org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    // Detailed policy bodies are filled in Phase 4; Phase 1 keeps them as nullable jsonb
    referralRatePolicyJson: jsonb('referral_rate_policy_json')
      .$type<Record<string, unknown> | null>()
      .default(sql`null`),
    depositPolicyJson: jsonb('deposit_policy_json')
      .$type<Record<string, unknown> | null>()
      .default(sql`null`),
    commissionPolicyJson: jsonb('commission_policy_json')
      .$type<Record<string, unknown> | null>()
      .default(sql`null`),

    // E-sign + lifecycle
    contractPdfUrl: text('contract_pdf_url'),
    agencySignedAt: timestamp('agency_signed_at', { withTimezone: true }),
    partnerSignedAt: timestamp('partner_signed_at', { withTimezone: true }),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }),
    effectiveUntil: timestamp('effective_until', { withTimezone: true }),

    isActive: boolean('is_active').notNull().default(false), // becomes true only when both sides sign
    terminatedAt: timestamp('terminated_at', { withTimezone: true }),
    terminatedReason: text('terminated_reason'),

    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pairUnique: uniqueIndex('partner_contracts_pair_unique').on(t.agencyOrgId, t.partnerOrgId),
    agencyActiveIdx: index('partner_contracts_agency_active_idx').on(t.agencyOrgId, t.isActive),
    partnerActiveIdx: index('partner_contracts_partner_active_idx').on(t.partnerOrgId, t.isActive),
  }),
);

export type PartnerContract = typeof partnerContracts.$inferSelect;
export type NewPartnerContract = typeof partnerContracts.$inferInsert;
