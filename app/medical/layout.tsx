import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { db } from '@/lib/db/client';
import { organizations } from '@/drizzle/schema/organizations';
import { AppShell } from '@/components/shared/layout/app-shell';
import { medicalSections } from '@/components/shared/layout/sidebar-sections';

export const dynamic = 'force-dynamic';

export default async function MedicalLayout({ children }: { children: React.ReactNode }): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, ctx.orgId)).limit(1);
  const pathname = headers().get('x-pathname') ?? '/medical/dashboard';
  return (
    <AppShell
      accountType="medical"
      orgName={org?.name ?? '— 병원 —'}
      userEmail={ctx.email}
      sections={medicalSections}
      currentPath={pathname}
    >
      {children}
    </AppShell>
  );
}
