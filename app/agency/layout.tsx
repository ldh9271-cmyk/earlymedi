import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
import { requireAccess } from '@/lib/auth/route-guards';
import { db } from '@/lib/db/client';
import { organizations } from '@/drizzle/schema/organizations';
import { AppShell } from '@/components/shared/layout/app-shell';
import { agencySections } from '@/components/shared/layout/sidebar-sections';

export default async function AgencyLayout({ children }: { children: React.ReactNode }): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, ctx.orgId)).limit(1);
  const pathname = headers().get('x-pathname') ?? '/agency/dashboard';
  return (
    <AppShell
      accountType="agency"
      orgName={org?.name ?? '— 조직 —'}
      userEmail={ctx.email}
      sections={agencySections}
      currentPath={pathname}
    >
      {children}
    </AppShell>
  );
}
