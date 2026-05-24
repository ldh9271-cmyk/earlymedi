import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { db } from '@/lib/db/client';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { organizations } from '@/drizzle/schema/organizations';
import { ACCOUNT_TYPE_COLOR, ACCOUNT_TYPE_LABEL_KO, ACCOUNT_TYPE_TO_PREFIX } from '@/lib/auth/account-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { EmptyState } from '@/components/shared/empty-state';

export const dynamic = 'force-dynamic';
import { Building2 } from 'lucide-react';
import { SwitchOrgForm } from './_components/switch-org-form';

export const metadata = { title: '활성 조직 선택' };

export default async function SelectOrgPage({
  searchParams,
}: {
  searchParams: { next?: string; denied?: string };
}): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  // Graceful fallback: if DATABASE_URL is missing or the schema hasn't been
  // migrated yet (fresh Supabase project), don't crash the page — show the
  // empty state so the user can still see a working login flow.
  let memberships: Array<{
    orgId: string;
    orgName: string;
    accountType: 'agency' | 'medical' | 'freelancer' | 'non_medical';
    role: string;
    status: string;
  }> = [];
  let dbError: string | null = null;
  try {
    memberships = await db
      .select({
        orgId: organizations.id,
        orgName: organizations.name,
        accountType: organizations.accountType,
        role: orgMemberships.role,
        status: orgMemberships.status,
      })
      .from(orgMemberships)
      .innerJoin(organizations, eq(orgMemberships.organizationId, organizations.id))
      .where(eq(orgMemberships.userId, auth.user.id));
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'unknown DB error';
    // eslint-disable-next-line no-console
    console.warn('[select-org] DB query failed, showing empty state:', dbError);
  }

  const active = memberships.filter((m) => m.status === 'active');

  if (active.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="가입된 조직이 없습니다"
        description="간편 가입(30초)으로 첫 조직을 만드세요. 환자 10명까지 무료 체험."
        action={
          <Link href="/signup">
            <Button variant="brand">간편 가입하고 시작하기 →</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">활성 조직 선택</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          한 사용자가 여러 카테고리의 조직에 소속될 수 있습니다. 들어갈 조직을 선택하세요.
        </p>
      </div>

      {searchParams.denied ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          접근 권한이 없는 URL입니다. 활성 조직 카테고리에 맞는 화면으로 다시 진입해 주세요.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {active.map((m) => (
          <Card key={m.orgId}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={ACCOUNT_TYPE_COLOR[m.accountType]}>
                  {ACCOUNT_TYPE_LABEL_KO[m.accountType]}
                </Badge>
                <span className="text-xs text-muted-foreground">{m.role}</span>
              </div>
              <CardTitle className="text-base">{m.orgName}</CardTitle>
              <CardDescription className="text-xs">
                {ACCOUNT_TYPE_TO_PREFIX[m.accountType]}/dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SwitchOrgForm
                orgId={m.orgId}
                accountType={m.accountType}
                nextPath={searchParams.next}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
