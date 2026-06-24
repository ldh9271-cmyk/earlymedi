'use server';

import 'server-only';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  partnerListings,
  partnerListingLocaleContent,
} from '@/drizzle/schema/partner-listings';
import { requireAccess } from '@/lib/auth/route-guards';
import { uploadListingImage } from '@/lib/storage/listing-images';
import {
  LISTING_CATEGORIES,
  canCreateCategory,
  isListingCategory,
  type ListingCategory,
} from '@/lib/listings/categories';
import { organizations } from '@/drizzle/schema/organizations';

/**
 * Agency-side listing actions. Mirror the master CRUD set but every
 * action enforces `ownerOrgId === ctx.orgId` so an agency cannot
 * touch another tenant's listings. Master goes through the parallel
 * /master/listings actions which bypass via service-role.
 *
 * Permission model:
 *   - account_type='agency' (여행사 등록 유치업체) is treated as the
 *     super-actor on the partner side: it can create any
 *     ListingCategory (canCreateCategory returns true).
 *   - Other actors get more restrictive UIs (/partner/listings,
 *     /medical/glowup-listings) added in follow-up commits.
 */

async function requireAgency(): Promise<{ orgId: string; userId: string; accountType: 'agency'; partnerSubtype: string | null }> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  // partner_subtype is meaningless for an agency org (it lives on
  // non_medical orgs), but the canCreateCategory helper needs the
  // shape so we pass null.
  return { orgId: ctx.orgId, userId: ctx.userId, accountType: 'agency', partnerSubtype: null };
}

function revalidateListingSurfaces(orgId: string): void {
  revalidatePath('/agency/listings');
  void orgId;
  // Public surfaces — featured listings cache on /kr & /glowup/pc.
  revalidatePath('/kr', 'layout');
  revalidatePath('/en', 'layout');
  revalidatePath('/zh', 'layout');
  revalidatePath('/ja', 'layout');
  revalidatePath('/ru', 'layout');
  revalidatePath('/vi', 'layout');
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || `listing-${Date.now().toString(36)}`;
}

/** Create empty draft owned by the active agency org, redirect to edit. */
export async function createListingAction(formData: FormData): Promise<void> {
  const ctx = await requireAgency();
  const rawCategory = String(formData.get('category') ?? '');
  if (!isListingCategory(rawCategory)) redirect('/agency/listings?error=bad_category');
  const category = rawCategory as ListingCategory;

  if (!canCreateCategory(ctx.accountType, ctx.partnerSubtype, category)) {
    redirect('/agency/listings?error=permission_denied');
  }

  const title = String(formData.get('title') ?? '').trim() || '신규 상품';
  const meta = LISTING_CATEGORIES.find((c) => c.key === category);
  const slug = slugify(title);

  const inserted = await db
    .insert(partnerListings)
    .values({
      ownerOrgId: ctx.orgId,
      category,
      slug,
      title,
      status: 'draft',
      featured: false,
      sortOrder: 100,
      priceUnit: meta?.defaultPriceUnit ?? null,
      interestKey: meta?.interestKey ?? null,
    })
    .returning({ id: partnerListings.id });
  const newId = inserted[0]?.id;
  if (!newId) redirect('/agency/listings?error=insert_failed');

  revalidateListingSurfaces(ctx.orgId);
  redirect(`/agency/listings/${newId}/edit`);
}

/**
 * Verify the listing belongs to the caller's org before mutating.
 * Returns the row's ownerOrgId so callers can early-exit on mismatch.
 */
async function verifyOwnership(listingId: string, callerOrgId: string): Promise<boolean> {
  const [row] = await db
    .select({ ownerOrgId: partnerListings.ownerOrgId })
    .from(partnerListings)
    .where(eq(partnerListings.id, listingId))
    .limit(1);
  return row?.ownerOrgId === callerOrgId;
}

export async function updateListingAction(formData: FormData): Promise<void> {
  const ctx = await requireAgency();
  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/agency/listings?error=missing_id');
  if (!(await verifyOwnership(id, ctx.orgId))) {
    redirect('/agency/listings?error=not_found');
  }

  const title = String(formData.get('title') ?? '').trim() || '제목 없음';
  const locationLabel = String(formData.get('locationLabel') ?? '').trim() || null;
  const priceWon = parseIntOrNull(formData.get('priceWon'));
  const priceUnit = String(formData.get('priceUnit') ?? '').trim() || null;
  const promoLabel = String(formData.get('promoLabel') ?? '').trim() || null;
  const featured = formData.get('featured') === 'on';
  const sortOrder = parseIntOrNull(formData.get('sortOrder')) ?? 100;
  const rating = parseIntOrNull(formData.get('rating'));
  const reviewsCount = parseIntOrNull(formData.get('reviewsCount')) ?? 0;
  const description = String(formData.get('description') ?? '').trim() || null;
  const interestKey = String(formData.get('interestKey') ?? '').trim() || null;
  // Agency cannot self-approve. Status only flips to 'pending'
  // (submit for review) or 'draft'. Master moves to 'approved'.
  const statusRaw = String(formData.get('status') ?? 'draft');
  const status = statusRaw === 'pending' ? 'pending' : 'draft';
  const city = String(formData.get('city') ?? '').trim();

  let details: Record<string, unknown> = {};
  const detailsRaw = formData.get('detailsJson');
  if (typeof detailsRaw === 'string' && detailsRaw.trim().length > 0) {
    try {
      const parsed = JSON.parse(detailsRaw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        details = parsed;
      }
    } catch {
      /* fall through with {} */
    }
  }

  await db
    .update(partnerListings)
    .set({
      title,
      locationLabel,
      priceWon: priceWon ?? null,
      priceUnit,
      promoLabel,
      featured,
      sortOrder,
      rating,
      reviewsCount,
      description,
      interestKey,
      status,
      addressJson: city ? { city } : {},
      details,
      updatedAt: new Date(),
    })
    .where(and(eq(partnerListings.id, id), eq(partnerListings.ownerOrgId, ctx.orgId)));

  revalidateListingSurfaces(ctx.orgId);
  redirect(`/agency/listings/${id}/edit?ok=1`);
}

export async function deleteListingAction(formData: FormData): Promise<void> {
  const ctx = await requireAgency();
  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/agency/listings?error=missing_id');
  await db
    .delete(partnerListings)
    .where(and(eq(partnerListings.id, id), eq(partnerListings.ownerOrgId, ctx.orgId)));
  revalidateListingSurfaces(ctx.orgId);
  redirect('/agency/listings');
}

export async function uploadListingImageAction(formData: FormData): Promise<void> {
  const ctx = await requireAgency();
  const id = String(formData.get('id') ?? '');
  const purpose = String(formData.get('purpose') ?? 'cover');
  if (!id || (purpose !== 'cover' && purpose !== 'gallery')) {
    redirect('/agency/listings?error=bad_upload');
  }
  if (!(await verifyOwnership(id, ctx.orgId))) {
    redirect('/agency/listings?error=not_found');
  }
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/agency/listings/${id}/edit?error=no_file`);
  }

  const res = await uploadListingImage({
    listingId: id,
    purpose: purpose as 'cover' | 'gallery',
    file: file as File,
  });
  if (!res.ok) {
    redirect(`/agency/listings/${id}/edit?error=${encodeURIComponent(res.error)}`);
  }

  if (purpose === 'cover') {
    await db
      .update(partnerListings)
      .set({ coverImageUrl: res.url, updatedAt: new Date() })
      .where(and(eq(partnerListings.id, id), eq(partnerListings.ownerOrgId, ctx.orgId)));
  } else {
    const [cur] = await db
      .select({ gallery: partnerListings.galleryImageUrls })
      .from(partnerListings)
      .where(eq(partnerListings.id, id))
      .limit(1);
    const next = [...((cur?.gallery ?? []) as string[]), res.url];
    await db
      .update(partnerListings)
      .set({ galleryImageUrls: next, updatedAt: new Date() })
      .where(and(eq(partnerListings.id, id), eq(partnerListings.ownerOrgId, ctx.orgId)));
  }

  revalidateListingSurfaces(ctx.orgId);
  redirect(`/agency/listings/${id}/edit?ok=upload`);
}

export async function removeGalleryImageAction(formData: FormData): Promise<void> {
  const ctx = await requireAgency();
  const id = String(formData.get('id') ?? '');
  const url = String(formData.get('url') ?? '');
  if (!id || !url) redirect('/agency/listings?error=bad_remove');
  if (!(await verifyOwnership(id, ctx.orgId))) {
    redirect('/agency/listings?error=not_found');
  }

  const [cur] = await db
    .select({ gallery: partnerListings.galleryImageUrls })
    .from(partnerListings)
    .where(eq(partnerListings.id, id))
    .limit(1);
  const next = ((cur?.gallery ?? []) as string[]).filter((u) => u !== url);
  await db
    .update(partnerListings)
    .set({ galleryImageUrls: next, updatedAt: new Date() })
    .where(and(eq(partnerListings.id, id), eq(partnerListings.ownerOrgId, ctx.orgId)));

  revalidateListingSurfaces(ctx.orgId);
  redirect(`/agency/listings/${id}/edit?ok=removed`);
}

export async function upsertListingLocaleAction(formData: FormData): Promise<void> {
  const ctx = await requireAgency();
  const id = String(formData.get('id') ?? '');
  const locale = String(formData.get('locale') ?? '');
  if (!id || !['kr', 'en', 'zh', 'ja', 'ru', 'vi'].includes(locale)) {
    redirect(`/agency/listings/${id}/edit?error=bad_locale`);
  }
  if (!(await verifyOwnership(id, ctx.orgId))) {
    redirect('/agency/listings?error=not_found');
  }
  const title = String(formData.get('title') ?? '').trim() || null;
  const description = String(formData.get('description') ?? '').trim() || null;
  const locationLabel = String(formData.get('locationLabel') ?? '').trim() || null;

  const [existing] = await db
    .select({ id: partnerListingLocaleContent.id })
    .from(partnerListingLocaleContent)
    .where(
      and(
        eq(partnerListingLocaleContent.listingId, id),
        eq(partnerListingLocaleContent.locale, locale),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(partnerListingLocaleContent)
      .set({ title, description, locationLabel, updatedAt: new Date() })
      .where(eq(partnerListingLocaleContent.id, existing.id));
  } else {
    await db.insert(partnerListingLocaleContent).values({
      listingId: id,
      locale,
      title,
      description,
      locationLabel,
    });
  }

  revalidateListingSurfaces(ctx.orgId);
  redirect(`/agency/listings/${id}/edit?lng=${locale}&ok=locale`);
}

/** Read owner org name once for the heading badge on edit page. */
export async function loadOwnerOrgName(orgId: string): Promise<string | null> {
  const [row] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return row?.name ?? null;
}

function parseIntOrNull(x: FormDataEntryValue | null): number | null {
  if (typeof x !== 'string') return null;
  const t = x.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n) : null;
}
