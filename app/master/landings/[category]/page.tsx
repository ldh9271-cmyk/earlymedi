import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { organizations } from '@/drizzle/schema/organizations';
import { PROCEDURE_CATALOG, PUBLIC_CATEGORIES, type PublicCategoryKey } from '@/lib/catalog';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Button } from '@/components/shared/ui/button';
import { listForCategorySafe, addListing, removeListing } from '../_actions';

const CATEGORY_LABELS: Record<string, string> = {
  plastic_surgery: '성형외과',
  dermatology: '피부과',
  dental: '치과',
  hair: '모발',
  health_checkup: '건강검진',
  beauty_tour: '뷰티 투어',
  makeup: '헤어·메이크업',
  photo_studio: '사진 스튜디오',
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { category: string };
}): Promise<{ title: string }> {
  const label = CATEGORY_LABELS[params.category] ?? params.category;
  return { title: `${label} 랜딩 관리 · 마스터` };
}

export default async function MasterLandingDetail({
  params,
  searchParams,
}: {
  params: { category: string };
  searchParams: { error?: string; procedure?: string };
}): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=/master/landings/${params.category}`);
  if (!isMasterEmail(auth.user.email ?? null)) redirect('/select-org');

  const isValid = (PUBLIC_CATEGORIES as readonly string[]).includes(params.category);
  if (!isValid) notFound();
  const category = params.category as PublicCategoryKey;

  const procedures = PROCEDURE_CATALOG[category];
  const activeProcedure = searchParams.procedure ?? null;

  // Load all listings for this category (we render them grouped per
  // procedure slug + a category-level bucket at the top). Uses the
  // Safe variant so a missing `category_listings` table renders a
  // friendly migration banner instead of crashing the page.
  const { rows: allListings, tableMissing } = await listForCategorySafe(category);

  // Load every hospital so the master can pick from a dropdown when
  // adding a new listing. Cross-org — RLS bypassed via /master.
  const hospitalRows = await db
    .select({
      id: hospitals.id,
      name: hospitals.name,
      orgName: organizations.name,
      primaryCategories: hospitals.primaryCategories,
    })
    .from(hospitals)
    .innerJoin(organizations, eq(hospitals.organizationId, organizations.id))
    .orderBy(hospitals.name);

  // Suggest hospitals whose primaryCategories already includes this
  // category — they're the most relevant.
  const suggested = hospitalRows.filter((h) =>
    ((h.primaryCategories ?? []) as string[]).includes(category),
  );
  const rest = hospitalRows.filter(
    (h) => !((h.primaryCategories ?? []) as string[]).includes(category),
  );

  // Group listings by procedureSlug ('' = category-level feature)
  const categoryLevel = allListings.filter((l) => l.procedureSlug === '');
  const byProcedure = new Map<string, typeof allListings>();
  for (const l of allListings) {
    if (l.procedureSlug !== '') {
      const arr = byProcedure.get(l.procedureSlug) ?? [];
      arr.push(l);
      byProcedure.set(l.procedureSlug, arr);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <Link
        href="/master/landings"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        카테고리 목록으로
      </Link>

      <header className="my-6">
        <Badge variant="destructive" className="mb-2">
          마스터 전용 · 카테고리 랜딩
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">
          {CATEGORY_LABELS[category] ?? category}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          이 카테고리의 시술별 노출 병원·호텔을 매핑합니다. 같은 병원을 여러
          시술에 동시 매핑할 수도 있습니다.
        </p>
      </header>

      {tableMissing ? (
        <div className="mb-6 rounded-lg border border-hospitality-300 bg-hospitality-50 p-4 text-sm">
          <p className="font-semibold text-hospitality-900">⚠ 데이터베이스 마이그레이션 필요</p>
          <p className="mt-1 text-xs text-hospitality-900/80">
            <code className="rounded bg-white px-1 font-mono">category_listings</code> 테이블이 없어
            매핑을 저장/조회할 수 없습니다. Supabase Dashboard → SQL Editor 에서{' '}
            <code className="rounded bg-white px-1 font-mono">drizzle/sql/category-listings.sql</code>{' '}
            를 실행한 후 새로고침해주세요.
          </p>
        </div>
      ) : null}

      {searchParams.error ? (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          ⚠ {searchParams.error}
        </div>
      ) : null}

      {/* Add listing form */}
      <Card className="mb-6 border-brand-200 bg-brand-50/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-brand-700" />
            <CardTitle className="text-base text-brand-900">병원·호텔 추가</CardTitle>
          </div>
          <CardDescription>
            시술을 선택하지 않으면 <strong>카테고리 카드 전체</strong>에 노출됩니다 (대표 추천).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addListing} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="categoryKey" value={category} />
            <div className="space-y-1.5">
              <Label htmlFor="procedureSlug">시술</Label>
              <select
                id="procedureSlug"
                name="procedureSlug"
                defaultValue={activeProcedure ?? ''}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— 카테고리 전체 (대표 추천) —</option>
                {procedures.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name.kr}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hospitalId">병원·호텔</Label>
              <select
                id="hospitalId"
                name="hospitalId"
                required
                defaultValue=""
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="" disabled>
                  선택…
                </option>
                {suggested.length > 0 ? (
                  <optgroup label={`${CATEGORY_LABELS[category]} 카테고리 등록 (${suggested.length})`}>
                    {suggested.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.orgName})
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {rest.length > 0 ? (
                  <optgroup label={`그 외 전체 병원·호텔 (${rest.length})`}>
                    {rest.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.orgName})
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sortOrder">정렬 순서 (작을수록 먼저)</Label>
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                defaultValue="100"
                min="1"
                max="9999"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promoLabel">프로모 라벨 (선택)</Label>
              <Input
                id="promoLabel"
                name="promoLabel"
                placeholder="예: 6월 한정 30% 할인"
                maxLength={50}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="brand">
                추가 / 업데이트
              </Button>
              <span className="ml-3 text-[11px] text-muted-foreground">
                같은 (시술 · 병원) 조합이 이미 있으면 정렬·라벨만 업데이트됩니다.
              </span>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Category-level (대표 추천) bucket */}
      <ListingGroup
        title="🌟 카테고리 대표 추천"
        subtitle={`${CATEGORY_LABELS[category]} 카드에 우선 노출되는 병원·호텔`}
        listings={categoryLevel}
        category={category}
      />

      {/* Per-procedure buckets */}
      {procedures.map((p) => {
        const items = byProcedure.get(p.slug) ?? [];
        return (
          <ListingGroup
            key={p.slug}
            title={p.name.kr}
            subtitle={`/${p.slug} · ${p.name.en}`}
            listings={items}
            category={category}
          />
        );
      })}
    </div>
  );
}

function ListingGroup({
  title,
  subtitle,
  listings,
  category,
}: {
  title: string;
  subtitle: string;
  listings: Array<{
    id: string;
    hospitalName: string;
    sortOrder: number;
    promoLabel: string | null;
  }>;
  category: string;
}): JSX.Element {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-baseline justify-between border-b pb-1.5">
        <div>
          <h2 className="text-sm font-bold">{title}</h2>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {listings.length}개
        </Badge>
      </div>
      {listings.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/20 px-4 py-3 text-center text-xs text-muted-foreground">
          매핑된 병원·호텔이 없습니다.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {listings.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    #{l.sortOrder}
                  </span>
                  <span className="font-medium">{l.hospitalName}</span>
                  {l.promoLabel ? (
                    <Badge variant="hospitality" className="text-[10px]">
                      {l.promoLabel}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <form action={removeListing}>
                <input type="hidden" name="id" value={l.id} />
                <input type="hidden" name="categoryKey" value={category} />
                <button
                  type="submit"
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="제거"
                  title="제거"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
