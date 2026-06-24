import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  partnerListings,
} from '@/drizzle/schema/partner-listings';
import { organizations } from '@/drizzle/schema/organizations';
import { requireAccess } from '@/lib/auth/route-guards';
import {
  LISTING_CATEGORIES,
  canCreateCategory,
  categoryLabel,
} from '@/lib/listings/categories';
import { createListingAction } from './_actions/listing-actions';

export const metadata = { title: '내 상품 관리 · 파트너' };
export const dynamic = 'force-dynamic';

/**
 * Partner-scoped listings index. Categories shown in the create
 * dropdown are filtered by canCreateCategory(partner_subtype) so a
 * hotel partner only sees Hotel + Restaurant, beauty partner only
 * sees PersonalColor/Hair/Makeup, etc. Trying to bypass via direct
 * POST is blocked server-side by createListingAction.
 */
export default async function PartnerListingsPage({
  searchParams,
}: {
  searchParams: { category?: string; error?: string };
}): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  const [org] = await db
    .select({ partnerSubtype: organizations.partnerSubtype })
    .from(organizations)
    .where(eq(organizations.id, ctx.orgId))
    .limit(1);
  const partnerSubtype = org?.partnerSubtype ?? null;
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
    rows = filter ? all.filter((r) => r.category === filter) : all;
  } catch (e) {
    dbError = e instanceof Error ? e.message : 'db_error';
  }

  const allowedCategories = LISTING_CATEGORIES.filter((c) =>
    canCreateCategory('non_medical', partnerSubtype, c.key),
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">내 상품 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {partnerSubtype ? `(${partnerSubtype} 파트너 권한) ` : ''}
            가입 카테고리에 맞는 상품을 등록하고 검수 요청을 보낼 수 있습니다.
          </p>
        </div>
        <Link
          href="/partner/dashboard"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← 대시보드
        </Link>
      </div>

      {allowedCategories.length === 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          가입 시 파트너 유형(호텔/식당/뷰티/사진/투어 중 하나)이 지정되어야 상품 등록이 가능합니다.
          관리자에게 문의해 주세요.
        </div>
      ) : (
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
      )}

      {allowedCategories.length > 0 ? (
        <div className="mb-5 flex flex-wrap gap-2 text-xs">
          <Link
            href="/partner/listings"
            className={`rounded-full border px-3 py-1.5 ${
              !filter ? 'border-foreground bg-foreground text-background' : 'border-input bg-card'
            }`}
          >
            전체
          </Link>
          {allowedCategories.map((c) => (
            <Link
              key={c.key}
              href={`/partner/listings?category=${c.key}`}
              className={`rounded-full border px-3 py-1.5 ${
                filter === c.key ? 'border-foreground bg-foreground text-background' : 'border-input bg-card'
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>
      ) : null}

      {dbError ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">DB 마이그레이션이 아직 실행되지 않았습니다.</p>
          <p className="mt-1 text-[11px] text-amber-900/70">원본 에러: {dbError}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
          {filter
            ? <>해당 카테고리에 등록된 상품이 없습니다.</>
            : <>아직 등록된 상품이 없습니다.</>}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">상품</th>
                <th className="px-3 py-3 text-left">카테고리</th>
                <th className="px-3 py-3 text-left">상태</th>
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
                  <td className="px-3 py-3 text-right tabular-nums">
                    {r.priceWon
                      ? `₩${r.priceWon.toLocaleString('ko-KR')} / ${r.priceUnit ?? ''}`
                      : '—'}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/partner/listings/${r.id}/edit`}
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
