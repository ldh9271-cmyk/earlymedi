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
import { organizations } from '@/drizzle/schema/organizations';
import { requireAccess } from '@/lib/auth/route-guards';
import { uploadListingImage } from '@/lib/storage/listing-images';
import {
  LISTING_CATEGORIES,
  canCreateCategory,
  isListingCategory,
  type ListingCategory,
} from '@/lib/listings/categories';

/**
 * Partner-side listing actions. Same shape as the agency variant but
 * also resolves the org's partner_subtype (hotel/restaurant/beauty/
 * photo/tour) to enforce category restrictions:
 *
 *   hotel partner   → 'hotel', 'restaurant'
 *   restaurant      → 'restaurant', 'food'
 *   beauty          → 'personal_color', 'hair', 'makeup'
 *   photo           → 'photo_studio'
 *   tour            → 'kpop_tour', 'travel_package'
 *
 * Trying to create a category outside the subtype's allow-list
 * redirects with ?error=permission_denied.
 */

async function requirePartner(): Promise<{ orgId: string; userId: string; partnerSubtype: string | null }> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  const [org] = await db
    .select({ partnerSubtype: organizations.partnerSubtype })
    .from(organizations)
    .where(eq(organizations.id, ctx.orgId))
    .limit(1);
  return {
    orgId: ctx.orgId,
    userId: ctx.userId,
    partnerSubtype: org?.partnerSubtype ?? null,
  };
}

function revalidateListingSurfaces(): void {
  revalidatePath('/partner/listings');
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

export async function createListingAction(formData: FormData): Promise<void> {
  const ctx = await requirePartner();
  const rawCategory = String(formData.get('category') ?? '');
  if (!isListingCategory(rawCategory)) redirect('/partner/listings?error=bad_category');
  const category = rawCategory as ListingCategory;

  if (!canCreateCategory('non_medical', ctx.partnerSubtype, category)) {
    redirect('/partner/listings?error=permission_denied');
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
  if (!newId) redirect('/partner/listings?error=insert_failed');

  revalidateListingSurfaces();
  redirect(`/partner/listings/${newId}/edit`);
}

async function verifyOwnership(listingId: string, callerOrgId: string): Promise<boolean> {
  const [row] = await db
    .select({ ownerOrgId: partnerListings.ownerOrgId })
    .from(partnerListings)
    .where(eq(partnerListings.id, listingId))
    .limit(1);
  return row?.ownerOrgId === callerOrgId;
}

export async function updateListingAction(formData: FormData): Promise<void> {
  const ctx = await requirePartner();
  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/partner/listings?error=missing_id');
  if (!(await verifyOwnership(id, ctx.orgId))) {
    redirect('/partner/listings?error=not_found');
  }

  const title = String(formData.get('title') ?? '').trim() || '제목 없음';
  const locationLabel = String(formData.get('locationLabel') ?? '').trim() || null;
  const priceWon = parseIntOrNull(formData.get('priceWon'));
  const priceUnit = String(formData.get('priceUnit') ?? '').trim() || null;
  const promoLabel = String(formData.get('promoLabel') ?? '').trim() || null;
  const sortOrder = parseIntOrNull(formData.get('sortOrder')) ?? 100;
  const rating = parseIntOrNull(formData.get('rating'));
  const reviewsCount = parseIntOrNull(formData.get('reviewsCount')) ?? 0;
  const description = String(formData.get('description') ?? '').trim() || null;
  const interestKey = String(formData.get('interestKey') ?? '').trim() || null;
  // Partner cannot self-feature / self-approve.
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

  revalidateListingSurfaces();
  redirect(`/partner/listings/${id}/edit?ok=1`);
}

export async function deleteListingAction(formData: FormData): Promise<void> {
  const ctx = await requirePartner();
  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/partner/listings?error=missing_id');
  await db
    .delete(partnerListings)
    .where(and(eq(partnerListings.id, id), eq(partnerListings.ownerOrgId, ctx.orgId)));
  revalidateListingSurfaces();
  redirect('/partner/listings');
}

export async function uploadListingImageAction(formData: FormData): Promise<void> {
  const ctx = await requirePartner();
  const id = String(formData.get('id') ?? '');
  const purpose = String(formData.get('purpose') ?? 'cover');
  if (!id || (purpose !== 'cover' && purpose !== 'gallery')) {
    redirect('/partner/listings?error=bad_upload');
  }
  if (!(await verifyOwnership(id, ctx.orgId))) {
    redirect('/partner/listings?error=not_found');
  }
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/partner/listings/${id}/edit?error=no_file`);
  }

  const res = await uploadListingImage({
    listingId: id,
    purpose: purpose as 'cover' | 'gallery',
    file: file as File,
  });
  if (!res.ok) {
    redirect(`/partner/listings/${id}/edit?error=${encodeURIComponent(res.error)}`);
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

  revalidateListingSurfaces();
  redirect(`/partner/listings/${id}/edit?ok=upload`);
}

export async function removeGalleryImageAction(formData: FormData): Promise<void> {
  const ctx = await requirePartner();
  const id = String(formData.get('id') ?? '');
  const url = String(formData.get('url') ?? '');
  if (!id || !url) redirect('/partner/listings?error=bad_remove');
  if (!(await verifyOwnership(id, ctx.orgId))) {
    redirect('/partner/listings?error=not_found');
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

  revalidateListingSurfaces();
  redirect(`/partner/listings/${id}/edit?ok=removed`);
}

export async function upsertListingLocaleAction(formData: FormData): Promise<void> {
  const ctx = await requirePartner();
  const id = String(formData.get('id') ?? '');
  const locale = String(formData.get('locale') ?? '');
  if (!id || !['kr', 'en', 'zh', 'ja', 'ru', 'vi'].includes(locale)) {
    redirect(`/partner/listings/${id}/edit?error=bad_locale`);
  }
  if (!(await verifyOwnership(id, ctx.orgId))) {
    redirect('/partner/listings?error=not_found');
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

  revalidateListingSurfaces();
  redirect(`/partner/listings/${id}/edit?lng=${locale}&ok=locale`);
}

function parseIntOrNull(x: FormDataEntryValue | null): number | null {
  if (typeof x !== 'string') return null;
  const t = x.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n) : null;
}
