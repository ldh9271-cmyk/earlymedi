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
import { billingAccounts, billingPlans } from '@/drizzle/schema/billing';
import { auditLogs } from '@/drizzle/schema/audit';
import { setActiveOrgCookie } from '@/lib/auth/session-setters';
import { verifyInviteToken, hashToken } from '@/lib/auth/invite-tokens';
import { PARTNER_SUBTYPES, type PartnerSubtype } from '@/lib/agency/partner-subtypes';

/**
 * Accept a partner-business invite (agency → 호텔·스파·살롱·스튜디오 등).
 * Mirrors accept-freelancer-invite.ts:
 *
 *   1. Creates a NEW non_medical organization owned by the invitee,
 *      with the partner_subtype the agency picked at invite time.
 *   2. Inserts a billing_accounts row on the partner_listing plan.
 *   3. Makes the invitee the OWNER of the new org.
 *   4. Marks the invite accepted + switches active-org.
 *
 * No affiliation row — partner orgs are platform-wide resources; the
 * agency relationship materializes per booking via
 * partner_bookings.source_agency_org_id.
 */
const InputSchema = z.object({
  token: z.string().min(10),
  orgName: z.string().min(2).max(120),
});

export async function acceptPartnerInviteAction(
  raw: z.infer<typeof InputSchema>,
): Promise<string> {
  const input = InputSchema.parse(raw);

  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('unauthenticated');

  const payload = await verifyInviteToken(input.token);
  if (payload.intendedAccountType !== 'non_medical') {
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
    partnerName?: string;
    subtype?: string;
    invitingOrgId?: string;
  };
  const subtype: PartnerSubtype = PARTNER_SUBTYPES.includes(
    meta.subtype as PartnerSubtype,
  )
    ? (meta.subtype as PartnerSubtype)
    : 'other';

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

  // 2. Create the new partner organization
  const slug = `${input.orgName.replace(/\s+/g, '-').toLowerCase().slice(0, 40)}-${Date.now().toString(36)}`;
  const [newOrg] = await db
    .insert(organizations)
    .values({
      name: input.orgName,
      slug,
      accountType: 'non_medical',
      partnerSubtype: subtype,
    })
    .returning({ id: organizations.id, accountType: organizations.accountType });
  if (!newOrg) throw new Error('org_create_failed');

  // 3. Billing account on the entry-level partner plan. Missing plan
  //    row (unseeded DB) is skipped silently — org still works.
  const [plan] = await db
    .select({ id: billingPlans.id })
    .from(billingPlans)
    .where(eq(billingPlans.code, 'partner_listing'))
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

  // 5. Mark invite accepted
  await db
    .update(invites)
    .set({ acceptedAt: new Date(), acceptedByUserId: auth.user.id })
    .where(eq(invites.id, inviteRow.id));

  // 6. Switch active org
  await db.update(users).set({ activeOrgId: newOrg.id }).where(eq(users.id, auth.user.id));
  setActiveOrgCookie(newOrg.id, newOrg.accountType);

  // 7. Audit on BOTH sides (agency org for the onboarding, partner org
  //    for the org creation)
  await db.insert(auditLogs).values({
    organizationId: inviteRow.organizationId,
    actorUserId: auth.user.id,
    action: 'accept_invite',
    entityType: 'partner_org',
    entityId: newOrg.id,
    diff: { partnerOrgName: input.orgName, subtype },
  });
  await db.insert(auditLogs).values({
    organizationId: newOrg.id,
    actorUserId: auth.user.id,
    action: 'create',
    entityType: 'organization',
    entityId: newOrg.id,
    diff: { name: input.orgName, accountType: 'non_medical', subtype, source: 'partner_invite' },
  });

  return `/partner/dashboard?welcome=partner`;
}
