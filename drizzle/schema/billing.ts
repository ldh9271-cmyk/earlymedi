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
  accountTypeEnum,
  billingAccountStatusEnum,
  billingCycleEnum,
  billingPlanCodeEnum,
} from './enums';

/**
 * billing_plans
 *
 * Master catalog of plans available to each account_type. Seeded statically.
 * Format:
 *  - Agency: Starter / Growth / Pro (3-tier, monthly fee + GMV%)
 *  - Medical: Pay-as-you-go / Committed (prepaid charge + usage)
 *  - Non-medical: Listing (free) / Active (monthly fee + GMV%)
 *  - Freelancer: free
 */
export const billingPlans = pgTable(
  'billing_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: billingPlanCodeEnum('code').notNull(),
    accountType: accountTypeEnum('account_type').notNull(),
    name: text('name').notNull(), // display name
    description: text('description'),

    // Fees — all amounts in KRW minor units (= KRW won, since exponent=0)
    registrationFeeKrw: integer('registration_fee_krw').notNull().default(0),
    monthlyFeeKrw: integer('monthly_fee_krw').notNull().default(0),
    annualFeeKrw: integer('annual_fee_krw').notNull().default(0),
    prepaidChargeMinKrw: integer('prepaid_charge_min_krw').notNull().default(0),

    // Trial
    trialDays: integer('trial_days').notNull().default(0),

    // GMV settlement fee — basis points × 100 (e.g. 150 = 1.50%)
    settlementFeeBp: integer('settlement_fee_bp').notNull().default(0),

    // Limits
    seatLimit: integer('seat_limit'), // null = unlimited

    cycle: billingCycleEnum('cycle').notNull(),
    isActive: boolean('is_active').notNull().default(true),

    // Extra metadata (per-unit usage prices, feature toggles, etc.)
    metadata: jsonb('metadata')
      .$type<{
        usage_prices_krw?: {
          case_received?: number;
          chart_autofill?: number;
          chart_finalize?: number;
          interpreter_match?: number;
          quote_pdf?: number;
          ai_vision_per_call?: number;
          ai_stt_per_minute?: number;
          ai_llm_per_10k_tokens?: number;
        };
        features?: Record<string, boolean>;
        committed_annual_discount_bp?: number; // basis points × 100
      }>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    codeUnique: uniqueIndex('billing_plans_code_unique').on(t.code),
    accountTypeIdx: index('billing_plans_account_type_idx').on(t.accountType, t.isActive),
  }),
);

/**
 * billing_accounts
 *
 * One row per organization. Tracks current subscription state, prepaid balance,
 * and lifecycle. Phase 6 fills in real billing transactions; Phase 1 only
 * provisions accounts during signup so the org has somewhere to land.
 */
export const billingAccounts = pgTable(
  'billing_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    planId: uuid('plan_id')
      .notNull()
      .references(() => billingPlans.id, { onDelete: 'restrict' }),
    status: billingAccountStatusEnum('status').notNull().default('trial'),

    // Lifecycle timestamps
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    currentPeriodStartsAt: timestamp('current_period_starts_at', { withTimezone: true }),
    currentPeriodEndsAt: timestamp('current_period_ends_at', { withTimezone: true }),
    pastDueSince: timestamp('past_due_since', { withTimezone: true }),
    restrictedSince: timestamp('restricted_since', { withTimezone: true }),
    suspendedSince: timestamp('suspended_since', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),

    // Prepaid balance (Medical PAYG / Committed) in KRW minor units
    prepaidBalanceKrw: integer('prepaid_balance_krw').notNull().default(0),
    autoTopupEnabled: boolean('auto_topup_enabled').notNull().default(false),
    autoTopupThresholdKrw: integer('auto_topup_threshold_krw'),
    autoTopupAmountKrw: integer('auto_topup_amount_krw'),

    // Stripe / Toss customer pointers (Phase 6 fills these)
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    stripeConnectAccountId: text('stripe_connect_account_id'),
    tossCustomerId: text('toss_customer_id'),

    // Billing contact
    billingEmail: text('billing_email'),
    billingName: text('billing_name'),
    taxInvoiceEmail: text('tax_invoice_email'), // 세금계산서 수신

    // Configurable settlement-fee bearer policy: 'agency' | 'patient_added' | 'split'
    settlementFeeBearer: text('settlement_fee_bearer').notNull().default('agency'),

    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgUnique: uniqueIndex('billing_accounts_org_unique').on(t.organizationId),
    statusIdx: index('billing_accounts_status_idx').on(t.status),
    trialEndsIdx: index('billing_accounts_trial_ends_idx').on(t.trialEndsAt),
  }),
);

export type BillingPlan = typeof billingPlans.$inferSelect;
export type NewBillingPlan = typeof billingPlans.$inferInsert;
export type BillingAccount = typeof billingAccounts.$inferSelect;
export type NewBillingAccount = typeof billingAccounts.$inferInsert;
