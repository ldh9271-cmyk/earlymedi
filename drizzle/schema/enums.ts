import { pgEnum } from 'drizzle-orm/pg-core';

// ─────────────────────────────────────────────────────────
// Core account taxonomy — the 4 actors of the system
// ─────────────────────────────────────────────────────────
export const accountTypeEnum = pgEnum('account_type', [
  'agency', // 유치업체 (host)
  'freelancer', // 송객·통역·코디·인플루언서
  'medical', // 의료기관
  'non_medical', // 호텔·스파·살롱·스튜디오·식당·교통·관광
]);

export const partnerSubtypeEnum = pgEnum('partner_subtype', [
  'hotel',
  'spa',
  'salon',
  'studio',
  'restaurant',
  'transport',
  'tour',
  'shopping',
  'wellness',
  'other',
]);

// ─────────────────────────────────────────────────────────
// Membership · roles · status
// ─────────────────────────────────────────────────────────
export const membershipStatusEnum = pgEnum('membership_status', [
  'pending', // invited, not yet accepted
  'active',
  'suspended',
  'left',
]);

export const membershipRoleEnum = pgEnum('membership_role', [
  'owner',
  'admin',
  'manager',
  'member',
  'viewer',
]);

// ─────────────────────────────────────────────────────────
// Organization verification — uploaded docs review pipeline
// ─────────────────────────────────────────────────────────
export const orgVerificationStatusEnum = pgEnum('org_verification_status', [
  'unverified',
  'documents_submitted',
  'in_review',
  'verified',
  'rejected',
]);

// ─────────────────────────────────────────────────────────
// PII visibility for freelancers (per-affiliation flag)
// ─────────────────────────────────────────────────────────
export const piiVisibilityEnum = pgEnum('pii_visibility', [
  'none', // alias / nationality / language / procedure category only
  'minimal', // + first name initial
  'masked', // + masked passport / phone
  'full', // explicit agency-granted full access
]);

// ─────────────────────────────────────────────────────────
// Billing
// ─────────────────────────────────────────────────────────
export const billingPlanCodeEnum = pgEnum('billing_plan_code', [
  // Agency
  'agency_starter',
  'agency_growth',
  'agency_pro',
  // Medical
  'medical_payg',
  'medical_committed',
  // Non-medical
  'partner_listing',
  'partner_active',
  // Freelancer
  'freelancer_free',
]);

export const billingAccountStatusEnum = pgEnum('billing_account_status', [
  'trial', // free trial window
  'active', // subscription paid / balance positive
  'past_due', // payment failed, soft warning
  'restricted', // write-restricted, read still allowed
  'suspended', // hard suspended
  'cancelled',
]);

export const billingCycleEnum = pgEnum('billing_cycle', [
  'monthly',
  'annual',
  'usage_based',
  'one_time',
]);

// ─────────────────────────────────────────────────────────
// Audit
// ─────────────────────────────────────────────────────────
export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'update',
  'delete',
  'view',
  'approve',
  'reject',
  'finalize',
  'export',
  'login',
  'logout',
  'invite',
  'accept_invite',
  'change_role',
  'change_status',
  'payment',
  'refund',
  'payout',
  'ai_call',
]);
