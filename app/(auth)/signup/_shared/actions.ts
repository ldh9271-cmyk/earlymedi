'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db/client';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/auth/supabase-server';
import { organizations } from '@/drizzle/schema/organizations';
import { users } from '@/drizzle/schema/users';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { billingAccounts, billingPlans } from '@/drizzle/schema/billing';
import { freelancerAffiliations } from '@/drizzle/schema/affiliations';
import { partnerContracts } from '@/drizzle/schema/contracts';
import { setActiveOrgCookie } from '@/lib/auth/session-setters';
import {
  ACCOUNT_TYPE_TO_PREFIX,
  type AccountType,
} from '@/lib/auth/account-types';
import { auditLogs } from '@/drizzle/schema/audit';

const SignupInputSchema = z.object({
  accountType: z.enum(['agency', 'freelancer', 'medical', 'non_medical']),
  partnerSubtype: z
    .enum(['hotel', 'spa', 'salon', 'studio', 'restaurant', 'transport', 'tour', 'shopping', 'wellness', 'other'])
    .nullable()
    .optional(),
  orgName: z.string().min(2).max(120),
  legalName: z.string().max(120).optional(),
  representativeName: z.string().max(80).optional(),
  countryCode: z.string().length(2).default('KR'),
  timezone: z.string().default('Asia/Seoul'),
  defaultLocale: z.string().default('ko'),
  defaultCurrency: z.string().default('KRW'),
  businessRegistrationNumber: z.string().max(40).optional(),
  foreignPatientLicenseNumber: z.string().max(40).optional(),
  medicalLicenseNumber: z.string().max(40).optional(),
  // Plan selection (required for agency / medical / partner; ignored for freelancer)
  planCode: z
    .enum([
      'agency_starter',
      'agency_growth',
      'agency_pro',
      'medical_payg',
      'medical_committed',
      'partner_listing',
      'partner_active',
      'freelancer_free',
    ])
    .optional(),
  // Optional invite token (freelancer joining agency, partner created by agency, etc.)
  inviteAffiliationAgencyOrgId: z.string().uuid().optional(),
  // Verification docs (we record URL pointers — upload via Storage in Phase 1.x)
  verificationDocuments: z
    .record(
      z.string(),
      z.object({
        url: z.string().url(),
        uploadedAt: z.string(),
        verified: z.boolean().default(false),
      }),
    )
    .default({}),
});

export type SignupInput = z.infer<typeof SignupInputSchema>;

/**
 * Minimal signup payload used by the new unified /signup page.
 * Only 4 facts are required — no licenses, no tax info, no plan choice.
 * Defaults: trial plan (10-patient quota), KR locale, owner role.
 */
const QuickSignupSchema = z.object({
  accountType: z.enum(['agency', 'freelancer', 'medical', 'non_medical']),
  partnerSubtype: z
    .enum(['hotel', 'spa', 'salon', 'studio', 'restaurant', 'transport', 'tour', 'shopping', 'wellness', 'other'])
    .nullable()
    .optional(),
  orgName: z.string().min(2, '회사명은 2자 이상').max(120),
  representativeName: z.string().min(2, '담당자명은 2자 이상').max(80),
  contactPhone: z.string().min(8, '연락처를 입력해 주세요').max(40),
});

export type QuickSignupInput = z.infer<typeof QuickSignupSchema>;

/**
 * Unified, single-step signup. Trades the multi-step wizard for a 4-field
 * form. Every new org starts on the free trial plan for its account_type
 * (10 patient registrations free, then /upgrade). The user can fill in
 * tax / banking / verification docs later from the settings UI.
 *
 * Returns the dashboard URL to redirect to.
 */
export async function quickSignupAction(rawInput: QuickSignupInput): Promise<string> {
  const input = QuickSignupSchema.parse(rawInput);

  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('unauthenticated');

  // Default plan per actor — all start in 'trial' status; trial quota is
  // separate from the plan's own trialDays (we don't enforce trialDays for
  // the new flow, just the per-org 10-patient counter on billing_accounts).
  const defaultPlanByType: Record<AccountType, SignupInput['planCode']> = {
    agency: 'agency_starter',
    medical: 'medical_payg',
    non_medical: 'partner_listing',
    freelancer: 'freelancer_free',
  };
  const planCode = defaultPlanByType[input.accountType];
  if (!planCode) throw new Error('plan_resolution_failed');

  const [plan] = await db.select().from(billingPlans).where(eq(billingPlans.code, planCode)).limit(1);
  if (!plan) throw new Error(`plan_not_found:${planCode}`);

  // 1. users row (mirror of auth.users for FK targets)
  await db
    .insert(users)
    .values({
      id: auth.user.id,
      email: auth.user.email ?? '',
      fullName: input.representativeName,
      phone: input.contactPhone,
      locale: 'ko',
      timezone: 'Asia/Seoul',
    })
    .onConflictDoNothing();

  // 2. organization
  const slug = `${input.orgName.toLowerCase().replace(/[^a-z0-9가-힣]+/gi, '-').slice(0, 24)}-${nanoid(6)}`;
  const [org] = await db
    .insert(organizations)
    .values({
      accountType: input.accountType,
      partnerSubtype: input.accountType === 'non_medical' ? (input.partnerSubtype ?? 'other') : null,
      name: input.orgName,
      slug,
      countryCode: 'KR',
      timezone: 'Asia/Seoul',
      defaultLocale: 'ko',
      defaultCurrency: 'KRW',
      representativeName: input.representativeName,
      verificationStatus: 'unverified', // user can upload docs later from settings
    })
    .returning();
  if (!org) throw new Error('org_create_failed');

  // 3. owner membership
  await db.insert(orgMemberships).values({
    organizationId: org.id,
    userId: auth.user.id,
    role: 'owner',
    status: 'active',
    acceptedAt: new Date(),
  });

  // 4. billing account on trial — 10-patient quota lives here (default in
  // the schema), so we don't have to set it explicitly.
  await db.insert(billingAccounts).values({
    organizationId: org.id,
    planId: plan.id,
    status: 'trial',
    trialEndsAt: null, // no time-based expiry; only quota-based
    currentPeriodStartsAt: new Date(),
    currentPeriodEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    billingEmail: auth.user.email ?? null,
    billingName: input.representativeName,
  });

  // 5. audit
  await db.insert(auditLogs).values({
    organizationId: org.id,
    actorUserId: auth.user.id,
    action: 'create',
    entityType: 'organization',
    entityId: org.id,
    diff: { accountType: input.accountType, plan: planCode, signup: 'quick' },
    metadata: { reason: 'quick_signup' },
  });

  // 6. pointer + cookie
  await db.update(users).set({ activeOrgId: org.id }).where(eq(users.id, auth.user.id));
  setActiveOrgCookie(org.id, input.accountType);

  return `${ACCOUNT_TYPE_TO_PREFIX[input.accountType]}/dashboard?welcome=1`;
}

/**
 * Provisions a new organization, billing account, owner membership, and (when
 * applicable) any cross-org links derived from an invite. Uses the service
 * role so signup can write to RLS-protected tables before the very first
 * `app.current_org_id` is set.
 *
 * Returns the URL the client should redirect to.
 */
export async function provisionOrganizationAction(rawInput: SignupInput): Promise<string> {
  const input = SignupInputSchema.parse(rawInput);

  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('unauthenticated');

  const service = createSupabaseServiceClient();
  void service; // reserved for storage-backed doc uploads in Phase 1.x

  // Ensure users row exists (Supabase auth.users mirror).
  await db
    .insert(users)
    .values({
      id: auth.user.id,
      email: auth.user.email ?? '',
      fullName: input.representativeName ?? '',
      locale: input.defaultLocale,
      timezone: input.timezone,
    })
    .onConflictDoNothing();

  // Pick default plan if not provided (freelancer always gets free).
  const defaultPlanByType: Record<AccountType, SignupInput['planCode']> = {
    agency: 'agency_starter',
    medical: 'medical_payg',
    non_medical: 'partner_listing',
    freelancer: 'freelancer_free',
  };
  const planCode = input.planCode ?? defaultPlanByType[input.accountType];
  if (!planCode) throw new Error('plan_required');

  const [plan] = await db.select().from(billingPlans).where(eq(billingPlans.code, planCode)).limit(1);
  if (!plan) throw new Error(`plan_not_found:${planCode}`);

  // 1. Create org
  const slug = `${input.orgName.toLowerCase().replace(/[^a-z0-9가-힣]+/gi, '-').slice(0, 24)}-${nanoid(6)}`;
  const [org] = await db
    .insert(organizations)
    .values({
      accountType: input.accountType,
      partnerSubtype: input.partnerSubtype ?? null,
      name: input.orgName,
      legalName: input.legalName ?? null,
      slug,
      countryCode: input.countryCode,
      timezone: input.timezone,
      defaultLocale: input.defaultLocale,
      defaultCurrency: input.defaultCurrency,
      businessRegistrationNumber: input.businessRegistrationNumber ?? null,
      foreignPatientLicenseNumber: input.foreignPatientLicenseNumber ?? null,
      medicalLicenseNumber: input.medicalLicenseNumber ?? null,
      representativeName: input.representativeName ?? null,
      verificationDocuments: input.verificationDocuments,
      verificationStatus: 'documents_submitted',
    })
    .returning();

  if (!org) throw new Error('org_create_failed');

  // 2. Owner membership
  await db.insert(orgMemberships).values({
    organizationId: org.id,
    userId: auth.user.id,
    role: 'owner',
    status: 'active',
    acceptedAt: new Date(),
  });

  // 3. Billing account
  const trialEnd =
    plan.trialDays > 0 ? new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000) : null;
  await db.insert(billingAccounts).values({
    organizationId: org.id,
    planId: plan.id,
    status: trialEnd ? 'trial' : 'active',
    trialEndsAt: trialEnd,
    currentPeriodStartsAt: new Date(),
    currentPeriodEndsAt: trialEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    billingEmail: auth.user.email ?? null,
    billingName: input.representativeName ?? input.orgName,
  });

  // 4. Cross-org link (if invited)
  if (input.inviteAffiliationAgencyOrgId && input.accountType === 'freelancer') {
    await db.insert(freelancerAffiliations).values({
      agencyOrgId: input.inviteAffiliationAgencyOrgId,
      freelancerOrgId: org.id,
      referralCode: `${slug.slice(0, 8).toUpperCase()}-${nanoid(4).toUpperCase()}`,
      piiVisibility: 'none',
      isActive: true,
    });
  }
  if (input.inviteAffiliationAgencyOrgId && (input.accountType === 'medical' || input.accountType === 'non_medical')) {
    await db.insert(partnerContracts).values({
      agencyOrgId: input.inviteAffiliationAgencyOrgId,
      partnerOrgId: org.id,
      isActive: false, // both sides must e-sign
    });
  }

  // 5. Audit
  await db.insert(auditLogs).values({
    organizationId: org.id,
    actorUserId: auth.user.id,
    action: 'create',
    entityType: 'organization',
    entityId: org.id,
    diff: { accountType: input.accountType, plan: planCode },
    metadata: { reason: 'signup_wizard' },
  });

  // 6. Update user pointer + active org cookie
  await db.update(users).set({ activeOrgId: org.id }).where(eq(users.id, auth.user.id));
  setActiveOrgCookie(org.id, input.accountType);

  // 7. Redirect
  return `${ACCOUNT_TYPE_TO_PREFIX[input.accountType]}/dashboard?welcome=1`;
}
