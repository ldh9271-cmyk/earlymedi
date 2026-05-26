import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { db } from '@/lib/db/client';
import { organizations } from '@/drizzle/schema/organizations';
import { AppShell } from '@/components/shared/layout/app-shell';
import { partnerSections } from '@/components/shared/layout/sidebar-sections';

export const dynamic = 'force-dynamic';

export default async function PartnerLayout({ children }: { children: React.ReactNode }): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, ctx.orgId)).limit(1);
  const pathname = headers().get('x-pathname') ?? '/partner/dashboard';
  return (
    <AppShell
      accountType="non_medical"
      orgName={org?.name ?? '— 파트너 —'}
      organizationId={ctx.orgId}
      userEmail={ctx.email}
      sections={partnerSections}
      currentPath={pathname}
      isMaster={ctx.isMaster}
    >
      {children}
    </AppShell>
  );
}
