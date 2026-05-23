import 'server-only';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { organizations } from '@/drizzle/schema/organizations';
import type { AccountType } from './account-types';
import { ACTIVE_ORG_HEADER } from './active-org';
import { createSupabaseServerClient } from './supabase-server';

export type RouteContext = {
  userId: string;
  email: string;
  orgId: string;
  accountType: AccountType;
  membershipRole: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
};

/**
 * Server-component / route-handler guard. Reads the user + active org that the
 * middleware already verified, and additionally enforces ALLOWED_ACCOUNT_TYPES.
 *
 * Throws via redirect() on failure — never returns an unauthorized context.
 *
 * Usage in a Server Component or Route Handler:
 *
 *   const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
 */
export async function requireAccess(opts: {
  allowedAccountTypes: readonly AccountType[];
}): Promise<RouteContext> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect('/login');
  }

  const activeOrgId = headers().get(ACTIVE_ORG_HEADER);
  if (!activeOrgId) {
    redirect('/select-org');
  }

  const rows = await db
    .select({
      orgId: organizations.id,
      accountType: organizations.accountType,
      role: orgMemberships.role,
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.organizationId, organizations.id))
    .where(
      and(
        eq(orgMemberships.userId, auth.user.id),
        eq(orgMemberships.organizationId, activeOrgId),
        eq(orgMemberships.status, 'active'),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    redirect('/select-org');
  }

  if (!opts.allowedAccountTypes.includes(row.accountType)) {
    redirect(`/select-org?denied=1`);
  }

  return {
    userId: auth.user.id,
    email: auth.user.email ?? '',
    orgId: row.orgId,
    accountType: row.accountType,
    membershipRole: row.role,
  };
}

/** API-route variant — returns Result rather than redirecting. */
export async function tryAccess(opts: {
  allowedAccountTypes: readonly AccountType[];
}): Promise<{ ok: true; ctx: RouteContext } | { ok: false; status: 401 | 403; reason: string }> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, status: 401, reason: 'unauthenticated' };

  const activeOrgId = headers().get(ACTIVE_ORG_HEADER);
  if (!activeOrgId) return { ok: false, status: 403, reason: 'no_active_org' };

  const rows = await db
    .select({
      orgId: organizations.id,
      accountType: organizations.accountType,
      role: orgMemberships.role,
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.organizationId, organizations.id))
    .where(
      and(
        eq(orgMemberships.userId, auth.user.id),
        eq(orgMemberships.organizationId, activeOrgId),
        eq(orgMemberships.status, 'active'),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return { ok: false, status: 403, reason: 'not_a_member' };

  if (!opts.allowedAccountTypes.includes(row.accountType)) {
    return { ok: false, status: 403, reason: 'account_type_not_allowed' };
  }

  return {
    ok: true,
    ctx: {
      userId: auth.user.id,
      email: auth.user.email ?? '',
      orgId: row.orgId,
      accountType: row.accountType,
      membershipRole: row.role,
    },
  };
}
