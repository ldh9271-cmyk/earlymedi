'use server';

import 'server-only';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { invites } from '@/drizzle/schema/invites';
import { organizations } from '@/drizzle/schema/organizations';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { users } from '@/drizzle/schema/users';
import { freelancerAffiliations } from '@/drizzle/schema/affiliations';
import { billingAccounts, billingPlans } from '@/drizzle/schema/billing';
import { auditLogs } from '@/drizzle/schema/audit';
import { setActiveOrgCookie } from '@/lib/auth/session-setters';
import { verifyInviteToken, hashToken } from '@/lib/auth/invite-tokens';

/**
 * Accept a freelancer-affiliation invite. Unlike a same-org team invite,
 * this:
 *   1. Creates a NEW freelancer organization owned by the invitee.
 *   2. Inserts a billing_accounts row (so trial counter works).
 *   3. Makes the invitee the OWNER of that new org.
 *   4. Creates the freelancer_affiliations row linking inviting agency
 *      ↔ new freelancer org with the referral_code that was minted
 *      when the invite was sent.
 *   5. Marks the invite accepted.
 *   6. Switches active-org to the new freelancer org.
 *
 * Design choice (per user request): each invite ALWAYS creates a new
 * freelancer org. A single person invited by multiple agencies ends
 * up with multiple separate freelancer orgs they can switch between
 * via /select-org. This keeps each agency-freelancer relationship
 * completely isolated (data, codes, settings).
 */
const InputSchema = z.object({
  token: z.string().min(10),
  orgName: z.string().min(2).max(120),
});

export async function acceptFreelancerInviteAction(
  raw: z.infer<typeof InputSchema>,
): Promise<string> {
  const input = InputSchema.parse(raw);

  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('unauthenticated');

  const payload = await verifyInviteToken(input.token);
  if (payload.intendedAccountType !== 'freelancer') {
    throw new Error('invalid_invite_kind');
  }
  const hash = hashToken(input.token);

  const [inviteRow] = await db
    .select()
    .from(invites)
    .where(eq(invites.tokenHash, hash))
    .limit(1);
  if (!inviteRow) throw new Error('invite_not_found');
  if (inviteRow.revokedAt) throw new Error('invite_revoked');
  if (inviteRow.acceptedAt) throw new Error('invite_already_accepted');
  if (inviteRow.expiresAt < new Date()) throw new Error('invite_expired');

  const meta = (inviteRow.metadata ?? {}) as {
    freelancerName?: string;
    referralCode?: string;
    invitingOrgId?: string;
  };
  const referralCode = meta.referralCode;
  if (!referralCode) throw new Error('invite_missing_referral_code');

  // 1. Ensure users row exists
  await db
    .insert(users)
    .values({
      id: auth.user.id,
      email: auth.user.email ?? inviteRow.email,
      fullName: '',
      locale: 'ko',
      timezone: 'Asia/Seoul',
    })
    .onConflictDoNothing();

  // 2. Create the new freelancer organization
  const slug = `${input.orgName.replace(/\s+/g, '-').toLowerCase().slice(0, 40)}-${Date.now().toString(36)}`;
  const [newOrg] = await db
    .insert(organizations)
    .values({
      name: input.orgName,
      slug,
      accountType: 'freelancer',
    })
    .returning({ id: organizations.id, accountType: organizations.accountType });
  if (!newOrg) throw new Error('org_create_failed');

  // 3. Create billing account so trial counter works. Look up the
  //    default freelancer plan first — billing_accounts.plan_id is
  //    required (FK to billing_plans).
  const [plan] = await db
    .select({ id: billingPlans.id })
    .from(billingPlans)
    .where(eq(billingPlans.code, 'freelancer_free'))
    .limit(1);
  if (plan) {
    await db
      .insert(billingAccounts)
      .values({
        organizationId: newOrg.id,
        planId: plan.id,
        status: 'trial',
        trialEndsAt: null,
        currentPeriodStartsAt: new Date(),
        currentPeriodEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billingEmail: auth.user.email ?? inviteRow.email,
        billingName: input.orgName,
      })
      .onConflictDoNothing();
  }
  // If the plan row is missing (DB seeded without plans), skip silently —
  // the org still works, just without trial counter rows.

  // 4. Make invitee the owner of the new org
  await db
    .insert(orgMemberships)
    .values({
      organizationId: newOrg.id,
      userId: auth.user.id,
      role: 'owner',
      status: 'active',
      invitedById: inviteRow.invitedByUserId,
      invitedEmail: inviteRow.email,
      invitedAt: inviteRow.createdAt,
      acceptedAt: new Date(),
    })
    .onConflictDoNothing();

  // 5. Create freelancer_affiliations row linking the two orgs
  await db
    .insert(freelancerAffiliations)
    .values({
      agencyOrgId: inviteRow.organizationId,
      freelancerOrgId: newOrg.id,
      referralCode,
      piiVisibility: 'none', // safe default; agency raises later via UI
      isActive: true,
    })
    .onConflictDoNothing();

  // 6. Mark invite accepted
  await db
    .update(invites)
    .set({ acceptedAt: new Date(), acceptedByUserId: auth.user.id })
    .where(eq(invites.id, inviteRow.id));

  // 7. Switch active org
  await db.update(users).set({ activeOrgId: newOrg.id }).where(eq(users.id, auth.user.id));
  setActiveOrgCookie(newOrg.id, newOrg.accountType);

  // 8. Audit on BOTH sides (agency org for the affiliation creation,
  //    freelancer org for the membership)
  await db.insert(auditLogs).values({
    organizationId: inviteRow.organizationId,
    actorUserId: auth.user.id,
    action: 'accept_invite',
    entityType: 'freelancer_affiliation',
    entityId: newOrg.id,
    diff: { referralCode, freelancerOrgName: input.orgName },
  });
  await db.insert(auditLogs).values({
    organizationId: newOrg.id,
    actorUserId: auth.user.id,
    action: 'create',
    entityType: 'organization',
    entityId: newOrg.id,
    diff: { name: input.orgName, accountType: 'freelancer', source: 'freelancer_invite' },
  });

  return `/freelancer/dashboard?welcome=affiliation`;
}
