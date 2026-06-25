import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { organizations } from '@/drizzle/schema/organizations';
import {
  LISTING_CATEGORIES,
  TRAVEL_PACKAGE_SUB_TYPES,
  categoryLabel,
  travelSubTypeLabel,
} from '@/lib/listings/categories';
import { createListingAction, seedFitProductsAction } from './_actions/listing-admin';
import { DeleteListingButton } from './_components/delete-listing-button';

export const metadata = { title: '글로우업 상품 관리 · 마스터' };
export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  category: string;
  title: string;
  status: string;
  featured: boolean;
  sortOrder: number;
  priceWon: number | null;
  priceUnit: string | null;
  coverImageUrl: string | null;
  ownerName: string | null;
  updatedAt: Date | null;
  details: Record<string, unknown>;
};

/**
 * Master-only listings index — cross-org table of every non-medical
 * marketplace card. Top of the page is a "신규 등록" form (category
 * select + title) that drops a draft and redirects into edit.
 *
 * If the migration (drizzle/sql/partner-listings.sql) hasn't been run
 * yet, the SELECT throws and we render the "no DB yet" empty state
 * with copy/paste SQL instructions instead of a 500.
 */
export default async function MasterListingsPage({
  searchParams,
}: {
  searchParams: { category?: string; error?: string; seedFit?: string; inserted?: string; skipped?: string };
}): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?next=/master/listings');
  if (!isMasterEmail(auth.user.email ?? null)) redirect('/select-org');

  const filter = searchParams.category;

  let rows: Row[] = [];
  let dbError: string | null = null;
  try {
    const all = await db
      .select({
        id: partnerListings.id,
        category: partnerListings.category,
        title: partnerListings.title,
        status: partnerListings.status,
        featured: partnerListings.featured,
        sortOrder: partnerListings.sortOrder,
        priceWon: partnerListings.priceWon,
        priceUnit: partnerListings.priceUnit,
        coverImageUrl: partnerListings.coverImageUrl,
        ownerName: organizations.name,
        updatedAt: partnerListings.updatedAt,
        details: partnerListings.details,
      })
      .from(partnerListings)
      .leftJoin(organizations, eq(organizations.id, partnerListings.ownerOrgId))
      .orderBy(desc(partnerListings.updatedAt));
    rows = (filter ? all.filter((r) => r.category === filter) : all).map((r) => ({
      ...r,
      details: (r.details ?? {}) as Record<string, unknown>,
    }));
  } catch (e) {
    dbError = e instanceof Error ? e.message : 'db_error';
  }

  // Agency-org dropdown for the create form's optional owner override.
  let agencyOrgs: Array<{ id: string; name: string }> = [];
  try {
    agencyOrgs = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.accountType, 'agency'))
      .limit(50);
  } catch {
    /* if orgs unreadable, the form still works using server-side default */
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">글로우업 상품 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            호텔 · 맛집 · 퍼스널컬러 · 헤어 · 메이크업 · 사진 · K-팝 투어 등 비의료
            카테고리 상품을 등록하고 메인 페이지(/kr) 노출을 제어합니다.
          </p>
        </div>
        <Link
          href="/master"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← 마스터 홈
        </Link>
      </div>

      {/* FIT 일괄 등록 결과 배너 — seedFitProductsAction 완료 시 표시. */}
      {searchParams.seedFit === 'ok' ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="font-semibold">FIT 자유여행 상품 일괄 등록 완료</span>
          {' — '}
          신규 {searchParams.inserted ?? '0'}건 등록, 기존 {searchParams.skipped ?? '0'}건 스킵.
        </div>
      ) : null}

      {/* FIT 자유여행 기본 상품 일괄 등록 트리거 */}
      <form
        action={seedFitProductsAction}
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-rose-200 bg-rose-50/40 px-4 py-3"
      >
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">FIT 자유여행 기본 상품 일괄 등록</p>
          <p className="mt-0.5">
            이동·픽업 5종 · 통역 2종 · 숙소 3종 · 예약대행 1종 = 총 11개. 자유여행 sub-type
            으로 status=공개, 같은 이름의 상품이 이미 있으면 자동 스킵 (멱등).
          </p>
        </div>
        <button
          type="submit"
          className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
        >
          FIT 11종 일괄 등록
        </button>
      </form>

      {/* New-listing form (top of page, always visible) */}
      <form
        action={createListingAction}
        className="mb-8 grid grid-cols-12 items-end gap-3 rounded-xl border bg-card p-5"
      >
        <div className="col-span-12 sm:col-span-3">
          <label className="block text-xs font-semibold uppercase tracking-wide">카테고리</label>
          <select
            name="category"
            required
            defaultValue=""
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>선택…</option>
            {LISTING_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="col-span-12 sm:col-span-5">
          <label className="block text-xs font-semibold uppercase tracking-wide">상품명</label>
          <input
            name="title"
            placeholder="예: 명동 5성 호텔 디럭스 더블"
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="col-span-12 sm:col-span-3">
          <label className="block text-xs font-semibold uppercase tracking-wide">소유 조직</label>
          <select
            name="ownerOrgId"
            defaultValue=""
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— 첫 번째 Agency org 자동 선택 —</option>
            {agencyOrgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <div className="col-span-12 sm:col-span-1">
          <button
            type="submit"
            className="h-10 w-full rounded-md bg-[#ff385c] px-3 text-sm font-semibold text-white"
          >
            + 등록
          </button>
        </div>
      </form>

      {/* Category filter chips */}
      <div className="mb-5 flex flex-wrap gap-2 text-xs">
        <Link
          href="/master/listings"
          className={`rounded-full border px-3 py-1.5 ${
            !filter ? 'border-foreground bg-foreground text-background' : 'border-input bg-card'
          }`}
        >
          전체
        </Link>
        {LISTING_CATEGORIES.map((c) => (
          <Link
            key={c.key}
            href={`/master/listings?category=${c.key}`}
            className={`rounded-full border px-3 py-1.5 ${
              filter === c.key ? 'border-foreground bg-foreground text-background' : 'border-input bg-card'
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {dbError ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">DB 마이그레이션이 아직 실행되지 않았습니다.</p>
          <p className="mt-1 text-xs">
            Supabase SQL Editor 에서 <code className="rounded bg-amber-100 px-1">drizzle/sql/partner-listings.sql</code> 파일을 실행하세요. 적용 후 새로고침하면 이 페이지가 정상 동작합니다.
          </p>
          <p className="mt-1 text-[11px] text-amber-900/70">
            원본 에러: {dbError}
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
          {filter
            ? <>해당 카테고리에 등록된 상품이 없습니다. 위 폼에서 추가하세요.</>
            : <>등록된 상품이 없습니다. 위 폼에서 카테고리를 선택해 첫 상품을 등록하세요.</>}
        </div>
      ) : filter === 'travel_package' ? (
        // travel_package — group by details.subType so 자유여행 /
        // 패키지여행 / 연수패키지 each get their own section header.
        // Listings missing a subType fall into "미분류".
        <TravelGroupedTable rows={rows} />
      ) : (
        <ListingTable rows={rows} />
      )}
    </div>
  );
}

function ListingTable({ rows }: { rows: Row[] }): JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3 text-left">상품</th>
            <th className="px-3 py-3 text-left">카테고리</th>
            <th className="px-3 py-3 text-left">상태</th>
            <th className="px-3 py-3 text-left">노출</th>
            <th className="px-3 py-3 text-right">가격</th>
            <th className="px-3 py-3 text-left">소유 조직</th>
            <th className="px-3 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <ListingRow key={r.id} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TravelGroupedTable({ rows }: { rows: Row[] }): JSX.Element {
  // Bucket by subType in the fixed order (free → package → training →
  // 미분류 last). Empty buckets are still shown so the master sees
  // which sub-types still need content.
  const buckets = new Map<string, Row[]>();
  for (const sub of TRAVEL_PACKAGE_SUB_TYPES) buckets.set(sub.key, []);
  buckets.set('__unset__', []);
  for (const r of rows) {
    const key = typeof r.details.subType === 'string' && r.details.subType
      ? r.details.subType
      : '__unset__';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(r);
  }
  return (
    <div className="space-y-6">
      {Array.from(buckets.entries()).map(([key, group]) => (
        <section key={key}>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">
              {key === '__unset__' ? '미분류' : travelSubTypeLabel(key)}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {group.length}개
              </span>
            </h2>
          </div>
          {group.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/10 px-4 py-6 text-center text-xs text-muted-foreground">
              이 하위 카테고리에 등록된 상품이 없습니다.
            </div>
          ) : (
            <ListingTable rows={group} />
          )}
        </section>
      ))}
    </div>
  );
}

function ListingRow({ row: r }: { row: Row }): JSX.Element {
  return (
    <tr className="border-t">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted"
            style={{
              background: r.coverImageUrl
                ? `#f2f2f2 url(${r.coverImageUrl}) center / cover`
                : '#f2f2f2',
            }}
          />
          <span className="font-medium">{r.title}</span>
        </div>
      </td>
      <td className="px-3 py-3">{categoryLabel(r.category)}</td>
      <td className="px-3 py-3">
        <StatusBadge status={r.status} />
      </td>
      <td className="px-3 py-3">
        {r.featured ? (
          <span className="rounded-full bg-[#ff385c]/10 px-2 py-0.5 text-[10px] font-medium text-[#ff385c]">
            FEATURED
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">
        {r.priceWon
          ? `₩${r.priceWon.toLocaleString('ko-KR')} / ${r.priceUnit ?? ''}`
          : '—'}
      </td>
      <td className="px-3 py-3 text-muted-foreground">{r.ownerName ?? '—'}</td>
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/master/listings/${r.id}/edit`}
            className="text-xs font-medium text-foreground underline-offset-4 hover:underline"
          >
            편집 →
          </Link>
          <span className="text-muted-foreground/40">|</span>
          <DeleteListingButton id={r.id} title={r.title} />
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }): JSX.Element {
  const palette = {
    draft:    { bg: '#f3f4f6', text: '#374151', label: '초안' },
    pending:  { bg: '#fef3c7', text: '#92400e', label: '검수 대기' },
    approved: { bg: '#ecfdf5', text: '#047857', label: '공개' },
    rejected: { bg: '#fee2e2', text: '#991b1b', label: '반려' },
  }[status] ?? { bg: '#f3f4f6', text: '#374151', label: status };
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ background: palette.bg, color: palette.text }}
    >
      {palette.label}
    </span>
  );
}
