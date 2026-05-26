'use server';

import { eq, and } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { setActiveOrgCookie } from '@/lib/auth/session-setters';
import { db } from '@/lib/db/client';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { organizations } from '@/drizzle/schema/organizations';
import { users } from '@/drizzle/schema/users';
import {
  ACCOUNT_TYPE_TO_PREFIX,
  isAccountType,
  type AccountType,
} from '@/lib/auth/account-types';
import { isMasterEmail } from '@/lib/auth/master';

export async function switchOrgAction(input: {
  orgId: string;
  accountType: AccountType;
  nextPath?: string;
}): Promise<string> {
  if (!isAccountType(input.accountType)) {
    throw new Error('invalid_account_type');
  }
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('unauthenticated');

  const master = isMasterEmail(auth.user.email ?? '');

  // Master can switch to ANY org — verify the org exists and the
  // claimed accountType actually matches the DB. We skip the
  // org_memberships join because masters don't need a row there.
  if (master) {
    const [org] = await db
      .select({ accountType: organizations.accountType })
      .from(organizations)
      .where(eq(organizations.id, input.orgId))
      .limit(1);
    if (!org) throw new Error('org_not_found');
    if (org.accountType !== input.accountType) {
      throw new Error('account_type_mismatch');
    }
  } else {
    // Normal user: verify they actually have an active membership.
    const rows = await db
      .select({ accountType: organizations.accountType })
      .from(orgMemberships)
      .innerJoin(organizations, eq(orgMemberships.organizationId, organizations.id))
      .where(
        and(
          eq(orgMemberships.userId, auth.user.id),
          eq(orgMemberships.organizationId, input.orgId),
          eq(orgMemberships.status, 'active'),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) throw new Error('not_a_member');
    if (row.accountType !== input.accountType) throw new Error('account_type_mismatch');
  }

  setActiveOrgCookie(input.orgId, input.accountType);
  await db.update(users).set({ activeOrgId: input.orgId }).where(eq(users.id, auth.user.id));

  if (input.nextPath && input.nextPath.startsWith(ACCOUNT_TYPE_TO_PREFIX[input.accountType])) {
    return input.nextPath;
  }
  return `${ACCOUNT_TYPE_TO_PREFIX[input.accountType]}/dashboard`;
}
