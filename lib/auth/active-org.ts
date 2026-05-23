import 'server-only';
import { cookies } from 'next/headers';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { organizations } from '@/drizzle/schema/organizations';
import { users } from '@/drizzle/schema/users';
import { accountTypeForPath } from './account-types';
import type { AccountType } from './account-types';

import { ACTIVE_ORG_COOKIE, ACTIVE_ORG_HEADER } from './active-org-constants';
export { ACTIVE_ORG_COOKIE, ACTIVE_ORG_HEADER };

export type ActiveOrgContext = {
  orgId: string;
  accountType: AccountType;
  membershipRole: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
};

/**
 * Resolve the user's active organization. Priority:
 *   1. URL prefix (if /agency/... and the user has an active agency membership)
 *   2. `em.active_org` cookie
 *   3. users.active_org_id (cached pointer)
 *   4. First active membership (any account_type)
 *
 * Returns null if the user has no active memberships.
 */
export async function resolveActiveOrg(
  userId: string,
  pathname: string,
): Promise<ActiveOrgContext | null> {
  // 1. URL-prefix-implied account type
  const urlAccountType = accountTypeForPath(pathname);
  if (urlAccountType) {
    const fromUrl = await findActiveMembership(userId, { accountType: urlAccountType });
    if (fromUrl) return fromUrl;
  }

  // 2. Cookie
  const cookieOrgId = cookies().get(ACTIVE_ORG_COOKIE)?.value;
  if (cookieOrgId) {
    const fromCookie = await findActiveMembership(userId, { orgId: cookieOrgId });
    if (fromCookie) return fromCookie;
  }

  // 3. users.active_org_id pointer
  const [user] = await db
    .select({ activeOrgId: users.activeOrgId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (user?.activeOrgId) {
    const fromUser = await findActiveMembership(userId, { orgId: user.activeOrgId });
    if (fromUser) return fromUser;
  }

  // 4. First active membership
  return await findActiveMembership(userId, {});
}

async function findActiveMembership(
  userId: string,
  filter: { orgId?: string; accountType?: AccountType },
): Promise<ActiveOrgContext | null> {
  const conditions = [eq(orgMemberships.userId, userId), eq(orgMemberships.status, 'active')];
  if (filter.orgId) conditions.push(eq(orgMemberships.organizationId, filter.orgId));
  if (filter.accountType) conditions.push(eq(organizations.accountType, filter.accountType));

  const rows = await db
    .select({
      orgId: organizations.id,
      accountType: organizations.accountType,
      role: orgMemberships.role,
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.organizationId, organizations.id))
    .where(and(...conditions))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    orgId: row.orgId,
    accountType: row.accountType,
    membershipRole: row.role,
  };
}

/** Helper for /api routes: read x-em-active-org header (set by middleware). */
export function readActiveOrgHeader(headers: Headers): string | null {
  return headers.get(ACTIVE_ORG_HEADER);
}
