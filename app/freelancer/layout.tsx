import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { db } from '@/lib/db/client';
import { organizations } from '@/drizzle/schema/organizations';
import { AppShell } from '@/components/shared/layout/app-shell';
import { freelancerSections } from '@/components/shared/layout/sidebar-sections';

export const dynamic = 'force-dynamic';

export default async function FreelancerLayout({ children }: { children: React.ReactNode }): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['freelancer'] });
  const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, ctx.orgId)).limit(1);
  const pathname = headers().get('x-pathname') ?? '/freelancer/dashboard';
  return (
    <AppShell
      accountType="freelancer"
      orgName={org?.name ?? '— 조직 —'}
      organizationId={ctx.orgId}
      userEmail={ctx.email}
      sections={freelancerSections}
      currentPath={pathname}
    >
      {children}
    </AppShell>
  );
}
