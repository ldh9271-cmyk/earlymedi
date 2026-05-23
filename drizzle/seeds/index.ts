import { eq, sql } from 'drizzle-orm';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { db, dbExec } from '@/lib/db/client';
import { billingAccounts, billingPlans } from '../schema/billing';
import { organizations } from '../schema/organizations';
import { users } from '../schema/users';
import { orgMemberships } from '../schema/memberships';
import { freelancerAffiliations } from '../schema/affiliations';
import { partnerContracts } from '../schema/contracts';
import { BILLING_PLAN_SEEDS } from './billing-plans';
import {
  DEMO_ORG_AGENCY,
  DEMO_ORG_FREELANCER,
  DEMO_ORG_MEDICAL,
  DEMO_ORG_PARTNER_HOTEL,
  DEMO_ORGS,
  DEMO_USERS,
  DEMO_USER_OWNER_AGENCY,
  DEMO_USER_OWNER_FREELANCER,
  DEMO_USER_OWNER_MEDICAL,
  DEMO_USER_OWNER_PARTNER,
  MASTER_OPERATOR_USER_ID,
} from './demo-organizations';
import { seedInboxDemo } from './inbox-demo';
import { seedClinicalDemo } from './clinical-demo';

export async function applyRlsPolicies(): Promise<void> {
  const rlsDir = path.resolve(process.cwd(), 'drizzle', 'rls');
  const files = (await readdir(rlsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort(); // 00_setup.sql first, then numbered
  for (const file of files) {
    const sqlText = await readFile(path.join(rlsDir, file), 'utf8');
    console.info(`[seed] applying RLS ${file} ...`);
    await dbExec(sqlText);
  }
}

export async function seedBillingPlans(): Promise<Map<string, string>> {
  console.info('[seed] billing_plans ...');
  const codeToId = new Map<string, string>();
  for (const plan of BILLING_PLAN_SEEDS) {
    const existing = await db
      .select({ id: billingPlans.id })
      .from(billingPlans)
      .where(eq(billingPlans.code, plan.code))
      .limit(1);
    if (existing[0]) {
      codeToId.set(plan.code, existing[0].id);
      continue;
    }
    const [inserted] = await db.insert(billingPlans).values(plan).returning({ id: billingPlans.id });
    if (!inserted) throw new Error(`Failed to insert plan ${plan.code}`);
    codeToId.set(plan.code, inserted.id);
  }
  return codeToId;
}

export async function seedDemoData(planByCode: Map<string, string>): Promise<void> {
  console.info('[seed] demo users ...');
  for (const u of DEMO_USERS) {
    await db
      .insert(users)
      .values({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        locale: u.locale,
        timezone: u.timezone,
        activeOrgId: u.activeOrgId,
      })
      .onConflictDoNothing();
  }

  console.info('[seed] demo organizations ...');
  for (const o of DEMO_ORGS) {
    await db.insert(organizations).values(o).onConflictDoNothing();
  }

  console.info('[seed] memberships (owner per org + master operator) ...');
  const ownerships: Array<{ orgId: string; userId: string }> = [
    { orgId: DEMO_ORG_AGENCY, userId: DEMO_USER_OWNER_AGENCY },
    { orgId: DEMO_ORG_FREELANCER, userId: DEMO_USER_OWNER_FREELANCER },
    { orgId: DEMO_ORG_MEDICAL, userId: DEMO_USER_OWNER_MEDICAL },
    { orgId: DEMO_ORG_PARTNER_HOTEL, userId: DEMO_USER_OWNER_PARTNER },
    // Master operator: owner in all 4 demo orgs (single email → /select-org → hop).
    { orgId: DEMO_ORG_AGENCY, userId: MASTER_OPERATOR_USER_ID },
    { orgId: DEMO_ORG_FREELANCER, userId: MASTER_OPERATOR_USER_ID },
    { orgId: DEMO_ORG_MEDICAL, userId: MASTER_OPERATOR_USER_ID },
    { orgId: DEMO_ORG_PARTNER_HOTEL, userId: MASTER_OPERATOR_USER_ID },
  ];
  for (const { orgId, userId } of ownerships) {
    await db
      .insert(orgMemberships)
      .values({
        organizationId: orgId,
        userId,
        role: 'owner',
        status: 'active',
        acceptedAt: new Date(),
      })
      .onConflictDoNothing();
  }

  console.info('[seed] billing_accounts ...');
  const planForOrg: Record<string, string> = {
    [DEMO_ORG_AGENCY]: 'agency_growth',
    [DEMO_ORG_FREELANCER]: 'freelancer_free',
    [DEMO_ORG_MEDICAL]: 'medical_committed',
    [DEMO_ORG_PARTNER_HOTEL]: 'partner_active',
  };
  for (const [orgId, planCode] of Object.entries(planForOrg)) {
    const planId = planByCode.get(planCode);
    if (!planId) throw new Error(`Missing plan ${planCode}`);
    await db
      .insert(billingAccounts)
      .values({
        organizationId: orgId,
        planId,
        status: 'active',
        currentPeriodStartsAt: new Date(),
        currentPeriodEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .onConflictDoNothing();
  }

  console.info('[seed] affiliations (agency ↔ freelancer) ...');
  await db
    .insert(freelancerAffiliations)
    .values({
      agencyOrgId: DEMO_ORG_AGENCY,
      freelancerOrgId: DEMO_ORG_FREELANCER,
      referralCode: 'DEMO-PARK',
      piiVisibility: 'minimal',
      commissionPolicyJson: {
        calc_type: 'percent_of_revenue',
        base: 'hospital_referral_fee',
        rate_bp: 3000, // 30.00% of agency's hospital referral fee
        vat_treatment: 'exclusive',
        withholding_tax_bp: 330, // 3.30% KR resident
        payout_trigger: 'on_treatment_done',
        payout_hold_days: 7,
      },
      contractSignedAt: new Date(),
      isActive: true,
    })
    .onConflictDoNothing();

  console.info('[seed] partner_contracts (agency ↔ medical, agency ↔ hotel) ...');
  for (const partnerOrgId of [DEMO_ORG_MEDICAL, DEMO_ORG_PARTNER_HOTEL]) {
    await db
      .insert(partnerContracts)
      .values({
        agencyOrgId: DEMO_ORG_AGENCY,
        partnerOrgId,
        agencySignedAt: new Date(),
        partnerSignedAt: new Date(),
        effectiveFrom: new Date(),
        isActive: true,
      })
      .onConflictDoNothing();
  }
}

export async function runSeed(): Promise<void> {
  await applyRlsPolicies();
  const planByCode = await seedBillingPlans();
  await seedDemoData(planByCode);
  await seedInboxDemo();
  await seedClinicalDemo();
  // touch updated_at on orgs
  await db
    .update(organizations)
    .set({ updatedAt: new Date() })
    .where(sql`true`);
  console.info('[seed] done');
}
