import { redirect } from 'next/navigation';
import { eq, asc } from 'drizzle-orm';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { db } from '@/lib/db/client';
import { orgMemberships } from '@/drizzle/schema/memberships';
import { organizations } from '@/drizzle/schema/organizations';
import { ACCOUNT_TYPE_COLOR, ACCOUNT_TYPE_LABEL_KO, ACCOUNT_TYPE_TO_PREFIX } from '@/lib/auth/account-types';
import { isMasterEmail } from '@/lib/auth/master';
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

  const isMaster = isMasterEmail(auth.user.email ?? '');

  // Masters have a dedicated control panel at /master that lists all
  // orgs grouped by category. Send them there unless `?denied=1` (which
  // means they tried to access a forbidden URL — keep them here so the
  // error message is visible).
  if (isMaster && !searchParams.denied) {
    const next = searchParams.next
      ? `/master?next=${encodeURIComponent(searchParams.next)}`
      : '/master';
    redirect(next);
  }

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
    if (isMaster) {
      // Master sees ALL organizations regardless of org_memberships rows.
      // We synthesize the same shape the normal path produces so the
      // render code below doesn't have to branch.
      const allOrgs = await db
        .select({
          orgId: organizations.id,
          orgName: organizations.name,
          accountType: organizations.accountType,
        })
        .from(organizations)
        .orderBy(asc(organizations.accountType), asc(organizations.name));
      memberships = allOrgs.map((o) => ({
        ...o,
        role: 'master',
        status: 'active',
      }));
    } else {
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
    }
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
        title={isMaster ? '플랫폼에 조직이 아직 없습니다' : '가입된 조직이 없습니다'}
        description={
          isMaster
            ? '마스터 모드입니다. 조직이 한 곳이라도 생성되면 모두 여기에 표시됩니다.'
            : '간편 가입(30초)으로 첫 조직을 만드세요. 환자 10명까지 무료 체험.'
        }
        action={
          isMaster ? undefined : (
            <Link href="/signup">
              <Button variant="brand">간편 가입하고 시작하기 →</Button>
            </Link>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isMaster ? '마스터 모드 — 조직 선택' : '활성 조직 선택'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isMaster
            ? `플랫폼의 모든 조직 ${active.length}개가 표시됩니다. 선택한 조직의 owner 권한으로 진입합니다.`
            : '한 사용자가 여러 카테고리의 조직에 소속될 수 있습니다. 들어갈 조직을 선택하세요.'}
        </p>
      </div>

      {isMaster ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <span className="font-semibold text-destructive">🔐 마스터 모드 활성</span>
          <span className="ml-2 text-destructive/80">
            모든 조직 데이터에 owner 권한으로 접근합니다. 모든 동작은 audit log에 기록됩니다.
          </span>
        </div>
      ) : null}

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
