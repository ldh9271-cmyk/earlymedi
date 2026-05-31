'use server';

import 'server-only';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { invites } from '@/drizzle/schema/invites';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { organizations } from '@/drizzle/schema/organizations';
import { users } from '@/drizzle/schema/users';
import { auditLogs } from '@/drizzle/schema/audit';
import { signInviteToken, verifyInviteToken, hashToken } from '@/lib/auth/invite-tokens';
import { setActiveOrgCookie } from '@/lib/auth/session-setters';
import { ACCOUNT_TYPE_TO_PREFIX } from '@/lib/auth/account-types';
import { headers } from 'next/headers';

/**
 * Team invitations: the org owner/admin emails a colleague, the colleague
 * clicks the link, signs in, and lands as an active member of the SAME
 * organization. No new org gets created (different from the legacy
 * cross-org freelancer/partner affiliation flow).
 */

const SendInviteSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해 주세요').max(255),
  role: z.enum(['admin', 'manager', 'member', 'viewer']).default('member'),
});

export type SendInviteInput = z.infer<typeof SendInviteSchema>;
export type SendInviteResult = { inviteUrl: string; expiresAt: Date };

async function requireOrgOwnerOrAdmin(): Promise<{
  userId: string;
  email: string;
  orgId: string;
}> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('unauthenticated');

  // Find the user's first OWNER or ADMIN membership. The current request's
  // active org isn't readily available to a server action without going
  // through middleware headers, so we pick the most relevant active
  // membership of the caller as the inviting org.
  const [m] = await db
    .select({
      orgId: orgMemberships.organizationId,
      role: orgMemberships.role,
    })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.userId, auth.user.id),
        eq(orgMemberships.status, 'active'),
      ),
    )
    .limit(5);
  if (!m) throw new Error('no_membership');

  // Only owner/admin/manager can invite (member/viewer cannot).
  if (!['owner', 'admin', 'manager'].includes(m.role)) {
    throw new Error('insufficient_role');
  }

  return { userId: auth.user.id, email: auth.user.email ?? '', orgId: m.orgId };
}

/**
 * Generates a new invite token + row, returns a shareable URL.
 * The token itself lives only in the URL — only its sha256 hash is stored.
 */
export async function sendTeamInviteAction(
  rawInput: SendInviteInput,
): Promise<SendInviteResult> {
  const input = SendInviteSchema.parse(rawInput);
  const { userId, orgId } = await requireOrgOwnerOrAdmin();

  // Reject self-invites
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user?.email && auth.user.email.toLowerCase() === input.email.toLowerCase()) {
    throw new Error('self_invite_not_allowed');
  }

  // Reject if there's an already-active membership with this email
  const [existingMember] = await db
    .select({ id: orgMemberships.id })
    .from(orgMemberships)
    .innerJoin(users, eq(orgMemberships.userId, users.id))
    .where(
      and(
        eq(orgMemberships.organizationId, orgId),
        eq(users.email, input.email.toLowerCase()),
        eq(orgMemberships.status, 'active'),
      ),
    )
    .limit(1);
  if (existingMember) throw new Error('already_member');

  // Insert invite row first (id needed in token)
  const [row] = await db
    .insert(invites)
    .values({
      organizationId: orgId,
      invitedByUserId: userId,
      email: input.email.toLowerCase(),
      role: input.role,
      intendedAccountType: null, // team invite = same org as inviter
      tokenHash: 'pending', // overwritten below
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    .returning({ id: invites.id, expiresAt: invites.expiresAt });
  if (!row) throw new Error('invite_create_failed');

  // Mint JWT + persist its hash on the same row
  const { token, tokenHash } = await signInviteToken({
    organizationId: orgId,
    invitedEmail: input.email.toLowerCase(),
    role: input.role,
    inviteId: row.id,
  });
  await db.update(invites).set({ tokenHash }).where(eq(invites.id, row.id));

  // Audit
  await db.insert(auditLogs).values({
    organizationId: orgId,
    actorUserId: userId,
    action: 'create',
    entityType: 'invite',
    entityId: row.id,
    diff: { email: input.email, role: input.role, kind: 'team' },
  });

  // Build shareable URL. Origin from request headers when available;
  // falls back to env so this also works in tests.
  const host = headers().get('host') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'earlymedi.vercel.app';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const inviteUrl = `${proto}://${host}/invite/${token}`;

  return { inviteUrl, expiresAt: row.expiresAt };
}

/**
 * Revokes a pending invite. Idempotent.
 */
export async function revokeTeamInviteAction(inviteId: string): Promise<void> {
  const { userId, orgId } = await requireOrgOwnerOrAdmin();

  await db
    .update(invites)
    .set({ revokedAt: new Date() })
    .where(and(eq(invites.id, inviteId), eq(invites.organizationId, orgId)));

  await db.insert(auditLogs).values({
    organizationId: orgId,
    actorUserId: userId,
    action: 'delete',
    entityType: 'invite',
    entityId: inviteId,
    metadata: { reason: 'revoked' },
  });
}

/**
 * Called from /invite/[token] after the user has authenticated. Creates the
 * org_memberships row, marks the invite accepted, updates the user's active
 * org pointer, and sets the active-org cookie so middleware picks it up on
 * the next navigation. Returns the dashboard URL to redirect to.
 */
export async function acceptTeamInviteAction(token: string): Promise<string> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('unauthenticated');

  const payload = await verifyInviteToken(token);
  const hash = hashToken(token);

  const [row] = await db.select().from(invites).where(eq(invites.tokenHash, hash)).limit(1);
  if (!row) throw new Error('invite_not_found');
  if (row.revokedAt) throw new Error('invite_revoked');
  if (row.acceptedAt) throw new Error('invite_already_accepted');
  if (row.expiresAt < new Date()) throw new Error('invite_expired');

  const [org] = await db
    .select({ id: organizations.id, accountType: organizations.accountType })
    .from(organizations)
    .where(eq(organizations.id, payload.organizationId))
    .limit(1);
  if (!org) throw new Error('org_not_found');

  // Ensure users row exists
  await db
    .insert(users)
    .values({
      id: auth.user.id,
      email: auth.user.email ?? payload.invitedEmail,
      fullName: '',
      locale: 'ko',
      timezone: 'Asia/Seoul',
    })
    .onConflictDoNothing();

  // Insert (or reactivate) membership
  await db
    .insert(orgMemberships)
    .values({
      organizationId: org.id,
      userId: auth.user.id,
      role: payload.role,
      status: 'active',
      invitedById: row.invitedByUserId,
      invitedEmail: payload.invitedEmail,
      invitedAt: row.createdAt,
      acceptedAt: new Date(),
    })
    .onConflictDoNothing(); // unique (org_id, user_id)

  // Mark invite accepted
  await db
    .update(invites)
    .set({ acceptedAt: new Date(), acceptedByUserId: auth.user.id })
    .where(eq(invites.id, row.id));

  // Switch active org to the newly joined one
  await db.update(users).set({ activeOrgId: org.id }).where(eq(users.id, auth.user.id));
  setActiveOrgCookie(org.id, org.accountType);

  await db.insert(auditLogs).values({
    organizationId: org.id,
    actorUserId: auth.user.id,
    action: 'accept_invite',
    entityType: 'invite',
    entityId: row.id,
  });

  return `${ACCOUNT_TYPE_TO_PREFIX[org.accountType]}/dashboard?welcome=team`;
}

/**
 * Read-only listing of current members + outstanding invites for an org.
 * Used by the team management page; the page server-component calls this
 * directly (no client roundtrip).
 */
export async function listTeamForOrg(orgId: string): Promise<{
  members: Array<{
    membershipId: string;
    userId: string;
    email: string;
    fullName: string | null;
    role: string;
    status: string;
    isOwner: boolean;
    joinedAt: Date | null;
  }>;
  pendingInvites: Array<{
    inviteId: string;
    email: string;
    role: string;
    invitedAt: Date;
    expiresAt: Date;
  }>;
}> {
  const memberRows = await db
    .select({
      membershipId: orgMemberships.id,
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
      role: orgMemberships.role,
      status: orgMemberships.status,
      joinedAt: orgMemberships.acceptedAt,
    })
    .from(orgMemberships)
    .innerJoin(users, eq(orgMemberships.userId, users.id))
    .where(eq(orgMemberships.organizationId, orgId));

  const inviteRows = await db
    .select({
      inviteId: invites.id,
      email: invites.email,
      role: invites.role,
      invitedAt: invites.createdAt,
      expiresAt: invites.expiresAt,
    })
    .from(invites)
    .where(
      and(
        eq(invites.organizationId, orgId),
        isNull(invites.acceptedAt),
        isNull(invites.revokedAt),
      ),
    );

  return {
    members: memberRows.map((r) => ({
      ...r,
      isOwner: r.role === 'owner',
    })),
    pendingInvites: inviteRows.filter((r) => r.expiresAt > new Date()),
  };
}
