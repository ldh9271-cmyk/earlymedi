import Link from 'next/link';
import { redirect } from 'next/navigation';
import { asc, eq, count } from 'drizzle-orm';
import { ShieldAlert, Building2, Users, Stethoscope, Briefcase, UserCheck, Plus, Hospital, Globe2 } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { organizations } from '@/drizzle/schema/organizations';
import { orgMemberships } from '@/drizzle/schema/memberships';
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_COLOR,
  ACCOUNT_TYPE_LABEL_KO,
  type AccountType,
} from '@/lib/auth/account-types';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent } from '@/components/shared/ui/card';
import { MasterOrgCard } from './_components/master-org-card';

export const dynamic = 'force-dynamic';
export const metadata = { title: '마스터 관리자 — KoreaGlowUp' };

/**
 * Master control panel. Lists every organization on the platform grouped
 * by the four actor types (의료기관 / 유치업체 / 파트너업체 / 프리랜서)
 * so a master operator can pick which tenant to enter.
 *
 * Auth model:
 *  - Must be authenticated → else /login
 *  - Must be in MASTER_EMAILS allowlist → else /select-org (treat as
 *    normal user; don't reveal that /master exists)
 *  - Once inside, every org card switches the active-org cookie and
 *    drops the operator into that org's dashboard with the red master
 *    banner showing they're impersonating.
 */
export default async function MasterPage({
  searchParams,
}: {
  searchParams: { deleted?: string; merged?: string; created?: string; error?: string };
}): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const email = auth.user.email ?? '';
  if (!isMasterEmail(email)) {
    // Don't 403 — quietly redirect non-masters to their normal landing.
    redirect('/select-org');
  }

  // Fetch every org + member count in one round-trip. We use a LEFT JOIN
  // through a sub-aggregate so orgs with zero active members still show
  // up (helpful for diagnosing onboarding drop-offs).
  let allOrgs: Array<{
    orgId: string;
    orgName: string;
    accountType: AccountType;
    memberCount: number;
  }> = [];
  let dbError: string | null = null;
  try {
    const orgsRaw = await db
      .select({
        orgId: organizations.id,
        orgName: organizations.name,
        accountType: organizations.accountType,
      })
      .from(organizations)
      .orderBy(asc(organizations.accountType), asc(organizations.name));

    // Member counts — separate query to avoid GROUP BY complexity.
    const counts = await db
      .select({
        orgId: orgMemberships.organizationId,
        memberCount: count(orgMemberships.id),
      })
      .from(orgMemberships)
      .where(eq(orgMemberships.status, 'active'))
      .groupBy(orgMemberships.organizationId);

    const countByOrg = new Map(counts.map((c) => [c.orgId, Number(c.memberCount)]));
    allOrgs = orgsRaw.map((o) => ({
      ...o,
      memberCount: countByOrg.get(o.orgId) ?? 0,
    }));
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'unknown DB error';
    // eslint-disable-next-line no-console
    console.warn('[master] org listing failed:', dbError);
  }

  // Group by account_type so the page renders one section per category.
  const grouped: Record<AccountType, typeof allOrgs> = {
    medical: [],
    agency: [],
    non_medical: [],
    freelancer: [],
  };
  for (const o of allOrgs) grouped[o.accountType].push(o);

  // Section header config — order is deliberate to mirror the business
  // hierarchy the founder described (의료기관 → 유치업체 → 파트너 → 프리랜서).
  const SECTIONS: Array<{
    type: AccountType;
    icon: typeof Stethoscope;
    description: string;
  }> = [
    {
      type: 'medical',
      icon: Stethoscope,
      description: '협력 의료기관 (병원·의원). 환자 시술·진료 담당.',
    },
    {
      type: 'agency',
      icon: Briefcase,
      description: '외국인환자 유치업체. 환자 모집·상담·인박스 운영.',
    },
    {
      type: 'non_medical',
      icon: Building2,
      description: '파트너업체 (회복호텔·통역사·교통·관광). 비의료 서비스 제공.',
    },
    {
      type: 'freelancer',
      icon: UserCheck,
      description: '프리랜서 송객·통역·코디네이터. 개인 사업자 단위.',
    },
  ];

  const totalOrgs = allOrgs.length;
  const totalByType = Object.fromEntries(
    ACCOUNT_TYPES.map((t) => [t, grouped[t].length]),
  );

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-5 py-8 md:px-8">
      {/* Top bar — minimal because /master is outside the gated AppShell */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
            <ShieldAlert className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">마스터 관리자</h1>
            <p className="text-xs text-muted-foreground">
              KoreaGlowUp 플랫폼 · {email}
            </p>
          </div>
        </div>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            로그아웃 →
          </button>
        </form>
      </header>

      {/* Action result banners */}
      {searchParams.deleted ? (
        <div className="mb-4 rounded-md border border-care-300 bg-care-50 p-3 text-xs text-care-900">
          ✅ 조직이 삭제되었습니다.
        </div>
      ) : null}
      {searchParams.merged ? (
        <div className="mb-4 rounded-md border border-care-300 bg-care-50 p-3 text-xs text-care-900">
          ✅ 조직이 합쳐졌습니다. 대상 조직에 모든 데이터가 이전되었습니다.
        </div>
      ) : null}
      {searchParams.created ? (
        <div className="mb-4 rounded-md border border-care-300 bg-care-50 p-3 text-xs text-care-900">
          ✅ 새 조직이 생성되었습니다.
        </div>
      ) : null}
      {searchParams.error ? (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          ⚠ 작업 실패: {searchParams.error}
        </div>
      ) : null}

      {/* Master mode warning */}
      <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
          <ShieldAlert className="h-4 w-4" />
          마스터 모드 — 모든 조직 데이터에 owner 권한으로 접근합니다
        </p>
        <p className="mt-1 text-xs text-destructive/80">
          조직 카드를 클릭하면 해당 조직의 owner처럼 대시보드에 진입합니다. 환자 데이터 수정·메시지
          발송 등 모든 동작은 audit log에 isMaster=true 플래그로 기록됩니다.
        </p>
      </div>

      {/* Quick admin actions — direct shortcuts to cross-org admin
          surfaces. Sits above the org list so the master operator
          doesn't have to scroll. */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/master/orgs/new"
          className="group flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50/40 p-4 transition hover:bg-brand-50 hover:shadow-sm"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
            <Plus className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-brand-900">신규 조직 등록</div>
            <p className="mt-0.5 text-[11px] text-brand-900/70">
              병원·유치업체·파트너·프리랜서를 마스터 권한으로 추가
            </p>
          </div>
        </Link>

        <Link
          href="/master/hospitals"
          className="group flex items-start gap-3 rounded-lg border bg-card p-4 transition hover:bg-muted/50 hover:shadow-sm"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-care-100 text-care-700">
            <Hospital className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold">병원 통합 관리</div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              전 Agency 병원 listing + 카테고리별 노출
            </p>
          </div>
        </Link>

        <Link
          href="/kr/admin"
          className="group flex items-start gap-3 rounded-lg border bg-card p-4 transition hover:bg-muted/50 hover:shadow-sm"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-hospitality-100 text-hospitality-700">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold">환자 가입 · 문의</div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              환자 자가 가입자 + 1:1 문의 리스트
            </p>
          </div>
        </Link>

        <Link
          href="/master/landings"
          className="group flex items-start gap-3 rounded-lg border bg-card p-4 transition hover:bg-muted/50 hover:shadow-sm"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
            <Globe2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold">카테고리 랜딩 관리</div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              시술 카탈로그 · 카테고리별 노출 병원 매핑
            </p>
          </div>
        </Link>
      </div>

      {/* Quick stats row */}
      <div className="mb-8 grid gap-3 sm:grid-cols-4">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.type}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    {ACCOUNT_TYPE_LABEL_KO[s.type]}
                  </div>
                  <div className="text-lg font-bold">{totalByType[s.type] ?? 0}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {dbError ? (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          DB 조회 실패: {dbError}
        </div>
      ) : null}

      {/* Sections — one per account_type */}
      <div className="space-y-10">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const orgs = grouped[s.type];
          return (
            <section key={s.type}>
              <div className="mb-3 flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-bold">
                    {ACCOUNT_TYPE_LABEL_KO[s.type]}
                  </h2>
                  <Badge variant={ACCOUNT_TYPE_COLOR[s.type]} className="text-[10px]">
                    {orgs.length}개
                  </Badge>
                </div>
                <span className="text-[11px] text-muted-foreground">{s.description}</span>
              </div>

              {orgs.length === 0 ? (
                <div className="rounded-md border border-dashed bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
                  등록된 {ACCOUNT_TYPE_LABEL_KO[s.type]}가 없습니다.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {orgs.map((o) => (
                    <MasterOrgCard
                      key={o.orgId}
                      orgId={o.orgId}
                      orgName={o.orgName}
                      accountType={o.accountType}
                      memberCount={o.memberCount}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {totalOrgs === 0 && !dbError ? (
        <div className="mt-10 rounded-lg border-2 border-dashed bg-muted/20 p-10 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <h3 className="text-sm font-semibold">아직 플랫폼에 등록된 조직이 없습니다</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            첫 사용자가 <Link href="/signup" className="underline">간편 가입</Link>으로 조직을 만들면
            여기에 표시됩니다.
          </p>
        </div>
      ) : null}
    </div>
  );
}
