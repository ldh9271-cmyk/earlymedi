import { eq } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { db } from '@/lib/db/client';
import { organizations } from '@/drizzle/schema/organizations';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { listTeamForOrg } from '@/lib/team/actions';
import { TeamManagement } from '@/components/shared/team-management';

export const metadata = { title: '팀원 관리' };
export const dynamic = 'force-dynamic';

export default async function AgencyTeamPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, ctx.orgId))
    .limit(1);
  const [myMembership] = await db
    .select({ role: orgMemberships.role })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, ctx.userId))
    .limit(1);

  const { members, pendingInvites } = await listTeamForOrg(ctx.orgId);

  const canInvite = ['owner', 'admin', 'manager'].includes(myMembership?.role ?? '');

  return (
    <TeamManagement
      orgName={org?.name ?? '— 조직 —'}
      members={members}
      pendingInvites={pendingInvites}
      canInvite={canInvite}
    />
  );
}
