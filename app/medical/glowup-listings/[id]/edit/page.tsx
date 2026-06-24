import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  partnerListings,
  partnerListingLocaleContent,
} from '@/drizzle/schema/partner-listings';
import { requireAccess } from '@/lib/auth/route-guards';
import { categoryLabel } from '@/lib/listings/categories';
import { ListingEditForm } from '../../../../master/listings/[id]/edit/_components/listing-form';
import {
  updateListingAction,
  uploadListingImageAction,
  removeGalleryImageAction,
  upsertListingLocaleAction,
  deleteListingAction,
} from '../../_actions/listing-actions';

export const dynamic = 'force-dynamic';

const LOCALES = ['kr', 'en', 'zh', 'ja', 'ru', 'vi'] as const;
type Locale = (typeof LOCALES)[number];

export default async function MedicalGlowupListingEditPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { lng?: string; ok?: string; error?: string };
}): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });

  const [row] = await db
    .select()
    .from(partnerListings)
    .where(eq(partnerListings.id, params.id))
    .limit(1);
  if (!row) notFound();
  if (row.ownerOrgId !== ctx.orgId) {
    redirect('/medical/glowup-listings?error=not_found');
  }

  const lng: Locale = LOCALES.includes(searchParams.lng as Locale)
    ? (searchParams.lng as Locale)
    : 'kr';

  const [locRow] = await db
    .select()
    .from(partnerListingLocaleContent)
    .where(
      and(
        eq(partnerListingLocaleContent.listingId, params.id),
        eq(partnerListingLocaleContent.locale, lng),
      ),
    )
    .limit(1);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <Link
            href="/medical/glowup-listings"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            ← 모든 부가 상품
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{row.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {categoryLabel(row.category)} · {row.status}
          </p>
        </div>
        <form action={deleteListingAction}>
          <input type="hidden" name="id" value={row.id} />
          <button
            type="submit"
            className="text-xs text-red-600 underline-offset-4 hover:underline"
          >
            삭제
          </button>
        </form>
      </div>

      {searchParams.ok ? (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
          저장되었습니다.
        </div>
      ) : null}
      {searchParams.error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          오류: {searchParams.error}
        </div>
      ) : null}

      <ListingEditForm
        listing={{
          id: row.id,
          category: row.category,
          title: row.title,
          slug: row.slug,
          status: row.status,
          locationLabel: row.locationLabel ?? '',
          priceWon: row.priceWon,
          priceUnit: row.priceUnit ?? '',
          coverImageUrl: row.coverImageUrl,
          galleryImageUrls: (row.galleryImageUrls ?? []) as string[],
          promoLabel: row.promoLabel ?? '',
          featured: row.featured,
          sortOrder: row.sortOrder,
          rating: row.rating,
          reviewsCount: row.reviewsCount,
          description: row.description ?? '',
          interestKey: row.interestKey ?? '',
          city: ((row.addressJson ?? {}) as { city?: string }).city ?? '',
          details: (row.details ?? {}) as Record<string, unknown>,
        }}
        updateAction={updateListingAction}
        uploadAction={uploadListingImageAction}
        removeGalleryAction={removeGalleryImageAction}
      />

      <div className="mt-10 rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">다국어 콘텐츠 ({lng.toUpperCase()})</h2>
          <div className="flex gap-1 text-[11px]">
            {LOCALES.map((l) => (
              <Link
                key={l}
                href={`/medical/glowup-listings/${row.id}/edit?lng=${l}`}
                className={`rounded-full border px-2.5 py-1 ${
                  lng === l ? 'border-foreground bg-foreground text-background' : 'border-input bg-card'
                }`}
              >
                {l.toUpperCase()}
              </Link>
            ))}
          </div>
        </div>
        <form action={upsertListingLocaleAction} className="grid gap-3">
          <input type="hidden" name="id" value={row.id} />
          <input type="hidden" name="locale" value={lng} />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide">제목</label>
            <input
              name="title"
              defaultValue={locRow?.title ?? ''}
              placeholder={`(${lng}) 제목`}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide">위치 라벨</label>
            <input
              name="locationLabel"
              defaultValue={locRow?.locationLabel ?? ''}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide">설명</label>
            <textarea
              name="description"
              defaultValue={locRow?.description ?? ''}
              rows={4}
              className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm"
            />
          </div>
          <button
            type="submit"
            className="self-end rounded-md bg-foreground px-4 py-2 text-xs font-semibold text-background"
          >
            {lng.toUpperCase()} 저장
          </button>
        </form>
      </div>
    </div>
  );
}
