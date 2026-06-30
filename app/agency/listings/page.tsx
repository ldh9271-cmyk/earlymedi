import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { requireAccess } from '@/lib/auth/route-guards';
import {
  LISTING_CATEGORIES_MARKETPLACE,
  canCreateCategory,
  categoryLabel,
} from '@/lib/listings/categories';
import { createListingAction } from './_actions/listing-actions';

export const metadata = { title: '글로우업 상품 관리 · 유치업체' };
export const dynamic = 'force-dynamic';

/**
 * Agency-scoped listing index — only rows owned by the active agency
 * org. Mirrors /master/listings but scopes to ownerOrgId and renders
 * a permission-aware category dropdown (an agency can create every
 * ListingCategory; partner subtypes get restricted in their own UIs).
 *
 * Status convention: agency can save as 'draft' or 'pending' (submit
 * for review). Master moves rows to 'approved' for public display.
 * Featured/sortOrder are read-only here (master controls the homepage
 * placement) — TODO: lift those into a master-only edit panel.
 */
export default async function AgencyListingsPage({
  searchParams,
}: {
  searchParams: { category?: string; error?: string };
}): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const filter = searchParams.category;

  type Row = {
    id: string;
    category: string;
    title: string;
    status: string;
    featured: boolean;
    priceWon: number | null;
    priceUnit: string | null;
    coverImageUrl: string | null;
    updatedAt: Date | null;
  };
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
        priceWon: partnerListings.priceWon,
        priceUnit: partnerListings.priceUnit,
        coverImageUrl: partnerListings.coverImageUrl,
        updatedAt: partnerListings.updatedAt,
      })
      .from(partnerListings)
      .where(eq(partnerListings.ownerOrgId, ctx.orgId))
      .orderBy(desc(partnerListings.updatedAt));
    // 'hospital' 은 글로우업 상품관리에서 제외 — 병원 마켓플레이스
    // (/agency/hospitals) 가 단일 진실원. 과거 시드로 만들어진 hospital
    // 행이 남아있으면 여기서도 가려서 중복 노출을 방지.
    const nonHospital = all.filter((r) => r.category !== 'hospital');
    rows = filter ? nonHospital.filter((r) => r.category === filter) : nonHospital;
  } catch (e) {
    dbError = e instanceof Error ? e.message : 'db_error';
  }

  // Agency is the super-actor on the partner side — every category
  // allowed. Helper still consulted so the rule is enforced
  // centrally if the policy ever changes.
  const allowedCategories = LISTING_CATEGORIES_MARKETPLACE.filter((c) =>
    canCreateCategory('agency', null, c.key),
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">글로우업 상품 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            호텔 · 맛집 · 퍼스널컬러 · 헤어 · 메이크업 · 사진 · K-팝 · 여행 패키지 등 비의료
            카테고리 상품을 직접 등록하고 검수 요청을 보낼 수 있습니다.
          </p>
        </div>
        <Link
          href="/agency/dashboard"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← 대시보드
        </Link>
      </div>

      {/* New-listing form */}
      <form
        action={createListingAction}
        className="mb-8 grid grid-cols-12 items-end gap-3 rounded-xl border bg-card p-5"
      >
        <div className="col-span-12 sm:col-span-4">
          <label className="block text-xs font-semibold uppercase tracking-wide">카테고리</label>
          <select
            name="category"
            required
            defaultValue=""
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>선택…</option>
            {allowedCategories.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="col-span-12 sm:col-span-7">
          <label className="block text-xs font-semibold uppercase tracking-wide">상품명</label>
          <input
            name="title"
            placeholder="예: 명동 5성 호텔 디럭스 더블"
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
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
          href="/agency/listings"
          className={`rounded-full border px-3 py-1.5 ${
            !filter ? 'border-foreground bg-foreground text-background' : 'border-input bg-card'
          }`}
        >
          전체
        </Link>
        {allowedCategories.map((c) => (
          <Link
            key={c.key}
            href={`/agency/listings?category=${c.key}`}
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
            마스터가 <code className="rounded bg-amber-100 px-1">drizzle/sql/partner-listings.sql</code>
            을 Supabase 에 적용해야 이 페이지가 동작합니다.
          </p>
          <p className="mt-1 text-[11px] text-amber-900/70">원본 에러: {dbError}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
          {filter
            ? <>해당 카테고리에 등록된 상품이 없습니다. 위 폼에서 추가하세요.</>
            : <>등록된 상품이 없습니다. 위 폼에서 카테고리를 선택해 첫 상품을 등록하세요.</>}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">상품</th>
                <th className="px-3 py-3 text-left">카테고리</th>
                <th className="px-3 py-3 text-left">상태</th>
                <th className="px-3 py-3 text-left">노출</th>
                <th className="px-3 py-3 text-right">가격</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
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
                  <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
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
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/agency/listings/${r.id}/edit`}
                      className="text-xs font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      편집 →
                    </Link>
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
