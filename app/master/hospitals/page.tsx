import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq, asc } from 'drizzle-orm';
import { ArrowLeft, Plus, Stethoscope } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { organizations } from '@/drizzle/schema/organizations';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';

export const metadata = { title: '병원 통합 관리 · 마스터' };
export const dynamic = 'force-dynamic';

/**
 * Master-only cross-org hospital index.
 *
 * Unlike /agency/hospitals (scoped to the active Agency org), this page
 * lists EVERY hospital across EVERY Agency org so the master operator
 * can spot duplicates / category gaps / unverified listings at a glance.
 *
 * New-hospital flow: master picks an Agency from a dropdown → jumps into
 * /agency/hospitals/onboard (the existing 5-step wizard) impersonating
 * that Agency. We don't fork the wizard — too much surface to keep in sync.
 */

const CATEGORY_LABELS: Record<string, { ko: string; en: string }> = {
  plastic_surgery: { ko: '성형외과', en: 'Plastic Surgery' },
  dermatology: { ko: '피부과', en: 'Dermatology' },
  dental: { ko: '치과', en: 'Dental' },
  hair: { ko: '모발', en: 'Hair' },
  health_checkup: { ko: '건강검진', en: 'Health Checkup' },
  beauty_tour: { ko: '뷰티 투어', en: 'Beauty Tour' },
  makeup: { ko: '헤어·메이크업', en: 'Hair & Makeup' },
  photo_studio: { ko: '사진 스튜디오', en: 'Photo Studio' },
  ophthalmology: { ko: '안과', en: 'Ophthalmology' },
  oriental: { ko: '한방', en: 'Oriental Medicine' },
};

export default async function MasterHospitalsPage({
  searchParams,
}: {
  searchParams: { category?: string };
}): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?next=/master/hospitals');
  if (!isMasterEmail(auth.user.email ?? null)) redirect('/select-org');

  // Cross-org fetch. RLS is normally Agency-scoped on this table, but
  // master is a global operator so we bypass via plain Drizzle (the
  // postgres role connection used by /master).
  let rows: Array<{
    id: string;
    name: string;
    slug: string;
    primaryCategories: string[];
    countryCode: string;
    organizationId: string;
    orgName: string | null;
    orgAccountType: string | null;
    foreignPatientLicenseNumber: string | null;
    createdAt: Date | null;
  }> = [];
  let loadError: string | null = null;
  try {
    const data = await db
      .select({
        id: hospitals.id,
        name: hospitals.name,
        slug: hospitals.slug,
        primaryCategories: hospitals.primaryCategories,
        countryCode: hospitals.countryCode,
        organizationId: hospitals.organizationId,
        orgName: organizations.name,
        orgAccountType: organizations.accountType,
        foreignPatientLicenseNumber: hospitals.foreignPatientLicenseNumber,
        createdAt: hospitals.createdAt,
      })
      .from(hospitals)
      .innerJoin(organizations, eq(hospitals.organizationId, organizations.id))
      .orderBy(desc(hospitals.createdAt))
      .limit(200);
    rows = data.map((r) => ({
      ...r,
      primaryCategories: (r.primaryCategories ?? []) as string[],
    }));
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'unknown';
  }

  // Apply category filter (URL ?category=plastic_surgery)
  const filter = searchParams.category;
  const filtered = filter
    ? rows.filter((h) => h.primaryCategories.includes(filter))
    : rows;

  // Fetch all Agency organizations so master can pick one for new-hospital
  // wizard entry. Only agency-type orgs can own hospitals.
  let agencyOrgs: Array<{ id: string; name: string }> = [];
  try {
    agencyOrgs = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.accountType, 'agency'))
      .orderBy(asc(organizations.name));
  } catch {
    // Non-fatal — keep the dropdown empty.
  }

  // Category histogram (count per category) for quick gap-spotting.
  const histogram = new Map<string, number>();
  for (const h of rows) {
    for (const c of h.primaryCategories) {
      histogram.set(c, (histogram.get(c) ?? 0) + 1);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <Link
        href="/master"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        마스터 콘솔로
      </Link>

      <header className="my-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="destructive" className="mb-2">
            마스터 전용
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight">병원 통합 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            모든 Agency 조직의 협력 병원 listing 을 한 화면에서 조회. 환자 포털
            카테고리 카드에 노출되는 데이터의 원천입니다.
          </p>
        </div>
      </header>

      {/* New-hospital launcher */}
      <Card className="mb-6 border-brand-200 bg-brand-50/30">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100">
              <Plus className="h-4 w-4 text-brand-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-brand-900">신규 병원 등록</p>
              <p className="mt-0.5 text-xs text-brand-900/70">
                병원은 Agency 조직에 속합니다. 어떤 Agency에 추가할지 선택하시면
                기존 5단계 위저드로 이동합니다 (마스터 권한 자동 적용).
              </p>
            </div>
          </div>
          <form action="/api/master/hospitals/onboard" method="get" className="flex flex-wrap gap-2">
            <select
              name="agencyOrgId"
              required
              defaultValue=""
              className="h-9 min-w-[260px] rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="" disabled>
                Agency 선택…
              </option>
              {agencyOrgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="brand">
              위저드 열기
            </Button>
            <Link href="/master/orgs/new" className="inline-flex">
              <Button type="button" variant="outline">
                + 새 Agency 만들기
              </Button>
            </Link>
          </form>
          {agencyOrgs.length === 0 ? (
            <p className="text-xs text-destructive">
              ⚠ 등록된 Agency 조직이 없습니다. 먼저 Agency를 생성해야 병원을 추가할 수 있습니다.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Category histogram filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/master/hospitals"
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            !filter
              ? 'bg-foreground text-background'
              : 'border border-border bg-card text-muted-foreground hover:bg-muted'
          }`}
        >
          전체 ({rows.length})
        </Link>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
          const count = histogram.get(key) ?? 0;
          return (
            <Link
              key={key}
              href={`/master/hospitals?category=${key}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                filter === key
                  ? 'bg-foreground text-background'
                  : 'border border-border bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {label.ko} ({count})
            </Link>
          );
        })}
      </div>

      {loadError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          병원 조회 실패: {loadError}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          <Stethoscope className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
          {filter ? `"${CATEGORY_LABELS[filter]?.ko ?? filter}" 카테고리에 등록된 병원이 없습니다.` : '아직 등록된 병원이 없습니다.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">병원명</th>
                <th className="px-3 py-2 text-left font-semibold">카테고리</th>
                <th className="px-3 py-2 text-left font-semibold">소속 Agency</th>
                <th className="px-3 py-2 text-left font-semibold">국가</th>
                <th className="px-3 py-2 text-left font-semibold">유치업 번호</th>
                <th className="px-3 py-2 text-left font-semibold">등록일</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((h) => (
                <tr key={h.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{h.name}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {h.primaryCategories.slice(0, 3).map((c) => (
                        <Badge key={c} variant="secondary" className="text-[10px]">
                          {CATEGORY_LABELS[c]?.ko ?? c}
                        </Badge>
                      ))}
                      {h.primaryCategories.length > 3 ? (
                        <span className="text-[10px] text-muted-foreground">
                          +{h.primaryCategories.length - 3}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{h.orgName ?? '—'}</td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {h.countryCode}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                    {h.foreignPatientLicenseNumber ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-[10px] text-muted-foreground">
                    {h.createdAt
                      ? new Date(h.createdAt).toLocaleDateString('ko-KR', {
                          year: '2-digit',
                          month: '2-digit',
                          day: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/master/hospitals/${h.id}/edit`}
                        className="text-xs font-medium text-brand-700 underline-offset-2 hover:underline"
                      >
                        편집
                      </Link>
                      <span className="text-muted-foreground/40">·</span>
                      <Link
                        href={`/api/master/hospitals/${h.id}/open`}
                        className="text-xs font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        열기 →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
