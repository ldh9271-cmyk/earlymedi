'use server';

import 'server-only';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { hospitalLocaleContent } from '@/drizzle/schema/hospital-locale-content';
import { auditLogs } from '@/drizzle/schema/audit';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import {
  uploadHospitalImage,
  deleteHospitalImageByUrl,
} from '@/lib/storage/hospital-images';

type Locale = 'kr' | 'en' | 'zh' | 'ja';
const LOCALES: readonly Locale[] = ['kr', 'en', 'zh', 'ja'] as const;

function parseLocale(raw: unknown): Locale {
  return typeof raw === 'string' && (LOCALES as readonly string[]).includes(raw)
    ? (raw as Locale)
    : 'kr';
}

async function requireMaster(): Promise<{ userId: string } | null> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  if (!isMasterEmail(auth.user.email ?? null)) return null;
  return { userId: auth.user.id };
}

function revalidateClinicSurfaces(): void {
  revalidatePath('/master/hospitals');
  revalidatePath('/kr/clinics', 'layout');
  revalidatePath('/en/clinics', 'layout');
  revalidatePath('/zh/clinics', 'layout');
  revalidatePath('/ja/clinics', 'layout');
}

function backToEdit(id: string, locale: Locale, qs?: string): never {
  const tail = qs ? `&${qs}` : '';
  redirect(`/master/hospitals/${id}/edit?lng=${locale}${tail}`);
}

/**
 * Read the current locale row (may not exist yet). Used internally
 * for upserts; callers shouldn't need this directly.
 */
async function loadLocaleRow(hospitalId: string, locale: Locale) {
  const [row] = await db
    .select({
      id: hospitalLocaleContent.id,
      coverImageUrl: hospitalLocaleContent.coverImageUrl,
      galleryImageUrls: hospitalLocaleContent.galleryImageUrls,
      landingImageUrl: hospitalLocaleContent.landingImageUrl,
    })
    .from(hospitalLocaleContent)
    .where(
      and(
        eq(hospitalLocaleContent.hospitalId, hospitalId),
        eq(hospitalLocaleContent.locale, locale),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function getHospitalOrgId(hospitalId: string): Promise<string | null> {
  const [h] = await db
    .select({ organizationId: hospitals.organizationId })
    .from(hospitals)
    .where(eq(hospitals.id, hospitalId))
    .limit(1);
  return h?.organizationId ?? null;
}

// ─────────────────────────────────────────────────────────────────────
// LOCALE-AWARE ACTIONS — write to hospital_locale_content
// Each accepts hidden formData: id (hospital id), lng (locale).
// ─────────────────────────────────────────────────────────────────────

/**
 * Upsert name + intro + SEO fields for one locale.
 * Empty strings are stored as NULL so the patient page can cleanly
 * fall back to other locales / base hospital row.
 */
export async function upsertLocaleBasics(formData: FormData): Promise<void> {
  const master = await requireMaster();
  if (!master) redirect('/select-org');

  const id = String(formData.get('id') ?? '');
  const locale = parseLocale(formData.get('lng'));
  if (!id) redirect('/master/hospitals?error=missing_id');

  const orgId = await getHospitalOrgId(id);
  if (!orgId) redirect('/master/hospitals?error=hospital_not_found');

  const norm = (v: unknown): string | null => {
    const s = typeof v === 'string' ? v.trim() : '';
    return s === '' ? null : s;
  };
  const name = norm(formData.get('name'));
  const intro = norm(formData.get('intro'));
  const seoTitle = norm(formData.get('seoTitle'));
  const seoDescription = norm(formData.get('seoDescription'));

  await db
    .insert(hospitalLocaleContent)
    .values({
      hospitalId: id,
      locale,
      name,
      intro,
      seoTitle,
      seoDescription,
    })
    .onConflictDoUpdate({
      target: [hospitalLocaleContent.hospitalId, hospitalLocaleContent.locale],
      set: {
        name,
        intro,
        seoTitle,
        seoDescription,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(auditLogs)
    .values({
      organizationId: orgId,
      actorUserId: master.userId,
      action: 'update',
      entityType: 'hospital',
      entityId: id,
      diff: { locale, introLength: intro?.length ?? 0 },
      metadata: {
        isMaster: true,
        source: 'master_console',
        kind: 'hospital_locale_basics',
      },
    })
    .catch(() => {});

  revalidateClinicSurfaces();
  backToEdit(id, locale, 'saved=1');
}

/**
 * Replace the cover image for one locale. Previous cover (this locale)
 * is best-effort deleted from Storage.
 */
export async function uploadLocaleCover(formData: FormData): Promise<void> {
  const master = await requireMaster();
  if (!master) redirect('/select-org');

  const id = String(formData.get('id') ?? '');
  const locale = parseLocale(formData.get('lng'));
  if (!id) redirect('/master/hospitals?error=missing_id');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    backToEdit(id, locale, 'error=no_file');
  }
  const result = await uploadHospitalImage({
    hospitalId: id,
    purpose: 'cover',
    file: file as File,
    locale,
  });
  if (!result.ok) {
    backToEdit(id, locale, `error=${encodeURIComponent(result.error)}`);
  }

  const orgId = await getHospitalOrgId(id);
  if (!orgId) redirect('/master/hospitals?error=hospital_not_found');
  const prev = await loadLocaleRow(id, locale);

  await db
    .insert(hospitalLocaleContent)
    .values({
      hospitalId: id,
      locale,
      coverImageUrl: result.url,
    })
    .onConflictDoUpdate({
      target: [hospitalLocaleContent.hospitalId, hospitalLocaleContent.locale],
      set: { coverImageUrl: result.url, updatedAt: new Date() },
    });

  if (prev?.coverImageUrl) {
    await deleteHospitalImageByUrl(prev.coverImageUrl);
  }

  await db
    .insert(auditLogs)
    .values({
      organizationId: orgId,
      actorUserId: master.userId,
      action: 'update',
      entityType: 'hospital',
      entityId: id,
      diff: { locale, coverImageUrl: result.url, previousUrl: prev?.coverImageUrl ?? null },
      metadata: {
        isMaster: true,
        source: 'master_console',
        kind: 'hospital_locale_cover_upload',
      },
    })
    .catch(() => {});

  revalidateClinicSurfaces();
  backToEdit(id, locale, 'saved=1');
}

export async function removeLocaleCover(formData: FormData): Promise<void> {
  const master = await requireMaster();
  if (!master) redirect('/select-org');

  const id = String(formData.get('id') ?? '');
  const locale = parseLocale(formData.get('lng'));
  if (!id) redirect('/master/hospitals?error=missing_id');

  const prev = await loadLocaleRow(id, locale);
  await db
    .update(hospitalLocaleContent)
    .set({ coverImageUrl: null, updatedAt: new Date() })
    .where(
      and(
        eq(hospitalLocaleContent.hospitalId, id),
        eq(hospitalLocaleContent.locale, locale),
      ),
    );

  if (prev?.coverImageUrl) {
    await deleteHospitalImageByUrl(prev.coverImageUrl);
  }

  revalidateClinicSurfaces();
  backToEdit(id, locale, 'saved=1');
}

export async function uploadLocaleLanding(formData: FormData): Promise<void> {
  const master = await requireMaster();
  if (!master) redirect('/select-org');

  const id = String(formData.get('id') ?? '');
  const locale = parseLocale(formData.get('lng'));
  if (!id) redirect('/master/hospitals?error=missing_id');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    backToEdit(id, locale, 'error=no_file');
  }
  const result = await uploadHospitalImage({
    hospitalId: id,
    purpose: 'landing',
    file: file as File,
    locale,
  });
  if (!result.ok) {
    backToEdit(id, locale, `error=${encodeURIComponent(result.error)}`);
  }

  const orgId = await getHospitalOrgId(id);
  if (!orgId) redirect('/master/hospitals?error=hospital_not_found');
  const prev = await loadLocaleRow(id, locale);

  await db
    .insert(hospitalLocaleContent)
    .values({
      hospitalId: id,
      locale,
      landingImageUrl: result.url,
    })
    .onConflictDoUpdate({
      target: [hospitalLocaleContent.hospitalId, hospitalLocaleContent.locale],
      set: { landingImageUrl: result.url, updatedAt: new Date() },
    });

  if (prev?.landingImageUrl) {
    await deleteHospitalImageByUrl(prev.landingImageUrl);
  }

  await db
    .insert(auditLogs)
    .values({
      organizationId: orgId,
      actorUserId: master.userId,
      action: 'update',
      entityType: 'hospital',
      entityId: id,
      diff: { locale, landingImageUrl: result.url, previousUrl: prev?.landingImageUrl ?? null },
      metadata: {
        isMaster: true,
        source: 'master_console',
        kind: 'hospital_locale_landing_upload',
      },
    })
    .catch(() => {});

  revalidateClinicSurfaces();
  backToEdit(id, locale, 'saved=1');
}

export async function removeLocaleLanding(formData: FormData): Promise<void> {
  const master = await requireMaster();
  if (!master) redirect('/select-org');

  const id = String(formData.get('id') ?? '');
  const locale = parseLocale(formData.get('lng'));
  if (!id) redirect('/master/hospitals?error=missing_id');

  const prev = await loadLocaleRow(id, locale);
  await db
    .update(hospitalLocaleContent)
    .set({ landingImageUrl: null, updatedAt: new Date() })
    .where(
      and(
        eq(hospitalLocaleContent.hospitalId, id),
        eq(hospitalLocaleContent.locale, locale),
      ),
    );

  if (prev?.landingImageUrl) {
    await deleteHospitalImageByUrl(prev.landingImageUrl);
  }

  revalidateClinicSurfaces();
  backToEdit(id, locale, 'saved=1');
}

export async function addLocaleGalleryImage(formData: FormData): Promise<void> {
  const master = await requireMaster();
  if (!master) redirect('/select-org');

  const id = String(formData.get('id') ?? '');
  const locale = parseLocale(formData.get('lng'));
  if (!id) redirect('/master/hospitals?error=missing_id');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    backToEdit(id, locale, 'error=no_file');
  }
  const result = await uploadHospitalImage({
    hospitalId: id,
    purpose: 'gallery',
    file: file as File,
    locale,
  });
  if (!result.ok) {
    backToEdit(id, locale, `error=${encodeURIComponent(result.error)}`);
  }

  const orgId = await getHospitalOrgId(id);
  if (!orgId) redirect('/master/hospitals?error=hospital_not_found');
  const prev = await loadLocaleRow(id, locale);
  const nextGallery = [
    ...((prev?.galleryImageUrls ?? []) as string[]),
    result.url,
  ];

  await db
    .insert(hospitalLocaleContent)
    .values({
      hospitalId: id,
      locale,
      galleryImageUrls: nextGallery,
    })
    .onConflictDoUpdate({
      target: [hospitalLocaleContent.hospitalId, hospitalLocaleContent.locale],
      set: { galleryImageUrls: nextGallery, updatedAt: new Date() },
    });

  await db
    .insert(auditLogs)
    .values({
      organizationId: orgId,
      actorUserId: master.userId,
      action: 'update',
      entityType: 'hospital',
      entityId: id,
      diff: { locale, addedUrl: result.url, total: nextGallery.length },
      metadata: {
        isMaster: true,
        source: 'master_console',
        kind: 'hospital_locale_gallery_add',
      },
    })
    .catch(() => {});

  revalidateClinicSurfaces();
  backToEdit(id, locale, 'saved=1');
}

export async function removeLocaleGalleryImage(formData: FormData): Promise<void> {
  const master = await requireMaster();
  if (!master) redirect('/select-org');

  const id = String(formData.get('id') ?? '');
  const locale = parseLocale(formData.get('lng'));
  const url = String(formData.get('url') ?? '');
  if (!id || !url) redirect('/master/hospitals?error=missing_fields');

  const prev = await loadLocaleRow(id, locale);
  const next = ((prev?.galleryImageUrls ?? []) as string[]).filter((u) => u !== url);

  await db
    .update(hospitalLocaleContent)
    .set({ galleryImageUrls: next, updatedAt: new Date() })
    .where(
      and(
        eq(hospitalLocaleContent.hospitalId, id),
        eq(hospitalLocaleContent.locale, locale),
      ),
    );

  await deleteHospitalImageByUrl(url);

  revalidateClinicSurfaces();
  backToEdit(id, locale, 'saved=1');
}

/**
 * Copy one locale's content to another. Useful for spinning up an EN
 * tab from a fully-filled KR tab and then translating in place. Only
 * fills target fields that are currently empty — never overwrites
 * existing localized content. Images are NOT duplicated (they keep
 * pointing to the source locale's storage path).
 */
export async function copyLocaleContent(formData: FormData): Promise<void> {
  const master = await requireMaster();
  if (!master) redirect('/select-org');

  const id = String(formData.get('id') ?? '');
  const fromLocale = parseLocale(formData.get('from'));
  const toLocale = parseLocale(formData.get('to'));
  if (!id || fromLocale === toLocale) {
    redirect(`/master/hospitals/${id}/edit?lng=${toLocale}&error=invalid_copy`);
  }

  const [src] = await db
    .select()
    .from(hospitalLocaleContent)
    .where(
      and(
        eq(hospitalLocaleContent.hospitalId, id),
        eq(hospitalLocaleContent.locale, fromLocale),
      ),
    )
    .limit(1);
  if (!src) {
    backToEdit(id, toLocale, 'error=source_empty');
  }

  // Pull existing target (so we only copy into NULL fields)
  const [tgt] = await db
    .select()
    .from(hospitalLocaleContent)
    .where(
      and(
        eq(hospitalLocaleContent.hospitalId, id),
        eq(hospitalLocaleContent.locale, toLocale),
      ),
    )
    .limit(1);

  const next = {
    hospitalId: id,
    locale: toLocale,
    name: tgt?.name ?? src!.name,
    intro: tgt?.intro ?? src!.intro,
    coverImageUrl: tgt?.coverImageUrl ?? src!.coverImageUrl,
    galleryImageUrls:
      tgt?.galleryImageUrls && (tgt.galleryImageUrls as string[]).length > 0
        ? tgt.galleryImageUrls
        : src!.galleryImageUrls,
    landingImageUrl: tgt?.landingImageUrl ?? src!.landingImageUrl,
    seoTitle: tgt?.seoTitle ?? src!.seoTitle,
    seoDescription: tgt?.seoDescription ?? src!.seoDescription,
  };

  await db
    .insert(hospitalLocaleContent)
    .values(next)
    .onConflictDoUpdate({
      target: [hospitalLocaleContent.hospitalId, hospitalLocaleContent.locale],
      set: {
        name: next.name,
        intro: next.intro,
        coverImageUrl: next.coverImageUrl,
        galleryImageUrls: next.galleryImageUrls,
        landingImageUrl: next.landingImageUrl,
        seoTitle: next.seoTitle,
        seoDescription: next.seoDescription,
        updatedAt: new Date(),
      },
    });

  revalidateClinicSurfaces();
  backToEdit(id, toLocale, 'saved=1');
}

// ─────────────────────────────────────────────────────────────────────
// LEGACY (base hospital) actions — kept for backward compat with any
// callers still posting to them. New UI uses the locale-aware actions
// above exclusively.
// ─────────────────────────────────────────────────────────────────────

/**
 * @deprecated Use upsertLocaleBasics. Updates hospitals.notes directly.
 */
export async function updateHospitalBasics(formData: FormData): Promise<void> {
  const master = await requireMaster();
  if (!master) redirect('/select-org');

  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/master/hospitals?error=missing_id');

  const rawNotes = String(formData.get('notes') ?? '').trim();
  const notes = rawNotes === '' ? null : rawNotes;

  const [updated] = await db
    .update(hospitals)
    .set({ notes, updatedAt: new Date() })
    .where(eq(hospitals.id, id))
    .returning({ id: hospitals.id, organizationId: hospitals.organizationId });

  if (!updated) redirect('/master/hospitals?error=hospital_not_found');

  await db
    .insert(auditLogs)
    .values({
      organizationId: updated.organizationId,
      actorUserId: master.userId,
      action: 'update',
      entityType: 'hospital',
      entityId: updated.id,
      diff: { notesLength: notes?.length ?? 0 },
      metadata: { isMaster: true, source: 'master_console', kind: 'hospital_notes' },
    })
    .catch(() => {});

  revalidateClinicSurfaces();
  redirect(`/master/hospitals/${id}/edit?saved=1`);
}

/** @deprecated Use uploadLocaleCover. */
export async function uploadCoverImage(formData: FormData): Promise<void> {
  const master = await requireMaster();
  if (!master) redirect('/select-org');

  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/master/hospitals?error=missing_id');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/master/hospitals/${id}/edit?error=no_file`);
  }
  const result = await uploadHospitalImage({
    hospitalId: id,
    purpose: 'cover',
    file: file as File,
  });
  if (!result.ok) {
    redirect(`/master/hospitals/${id}/edit?error=${encodeURIComponent(result.error)}`);
  }

  const [existing] = await db
    .select({ coverImageUrl: hospitals.coverImageUrl, organizationId: hospitals.organizationId })
    .from(hospitals)
    .where(eq(hospitals.id, id))
    .limit(1);
  if (!existing) redirect('/master/hospitals?error=hospital_not_found');
  const previousUrl = existing.coverImageUrl;

  await db
    .update(hospitals)
    .set({ coverImageUrl: result.url, updatedAt: new Date() })
    .where(eq(hospitals.id, id));

  if (previousUrl) {
    await deleteHospitalImageByUrl(previousUrl);
  }

  revalidateClinicSurfaces();
  redirect(`/master/hospitals/${id}/edit?saved=1`);
}

/** @deprecated Use removeLocaleCover. */
export async function removeCoverImage(formData: FormData): Promise<void> {
  const master = await requireMaster();
  if (!master) redirect('/select-org');

  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/master/hospitals?error=missing_id');

  const [existing] = await db
    .select({ coverImageUrl: hospitals.coverImageUrl, organizationId: hospitals.organizationId })
    .from(hospitals)
    .where(eq(hospitals.id, id))
    .limit(1);
  if (!existing) redirect('/master/hospitals?error=hospital_not_found');

  await db
    .update(hospitals)
    .set({ coverImageUrl: null, updatedAt: new Date() })
    .where(eq(hospitals.id, id));

  if (existing.coverImageUrl) {
    await deleteHospitalImageByUrl(existing.coverImageUrl);
  }

  revalidateClinicSurfaces();
  redirect(`/master/hospitals/${id}/edit?saved=1`);
}

/** @deprecated Use uploadLocaleLanding. */
export async function uploadLandingImage(formData: FormData): Promise<void> {
  const master = await requireMaster();
  if (!master) redirect('/select-org');

  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/master/hospitals?error=missing_id');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/master/hospitals/${id}/edit?error=no_file`);
  }
  const result = await uploadHospitalImage({
    hospitalId: id,
    purpose: 'landing',
    file: file as File,
  });
  if (!result.ok) {
    redirect(`/master/hospitals/${id}/edit?error=${encodeURIComponent(result.error)}`);
  }

  const [existing] = await db
    .select({ landingImageUrl: hospitals.landingImageUrl, organizationId: hospitals.organizationId })
    .from(hospitals)
    .where(eq(hospitals.id, id))
    .limit(1);
  if (!existing) redirect('/master/hospitals?error=hospital_not_found');
  const previousUrl = existing.landingImageUrl;

  await db
    .update(hospitals)
    .set({ landingImageUrl: result.url, updatedAt: new Date() })
    .where(eq(hospitals.id, id));

  if (previousUrl) {
    await deleteHospitalImageByUrl(previousUrl);
  }

  revalidateClinicSurfaces();
  redirect(`/master/hospitals/${id}/edit?saved=1`);
}

/** @deprecated Use removeLocaleLanding. */
export async function removeLandingImage(formData: FormData): Promise<void> {
  const master = await requireMaster();
  if (!master) redirect('/select-org');

  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/master/hospitals?error=missing_id');

  const [existing] = await db
    .select({ landingImageUrl: hospitals.landingImageUrl })
    .from(hospitals)
    .where(eq(hospitals.id, id))
    .limit(1);
  if (!existing) redirect('/master/hospitals?error=hospital_not_found');

  await db
    .update(hospitals)
    .set({ landingImageUrl: null, updatedAt: new Date() })
    .where(eq(hospitals.id, id));

  if (existing.landingImageUrl) {
    await deleteHospitalImageByUrl(existing.landingImageUrl);
  }

  revalidateClinicSurfaces();
  redirect(`/master/hospitals/${id}/edit?saved=1`);
}

/** @deprecated Use addLocaleGalleryImage. */
export async function addGalleryImage(formData: FormData): Promise<void> {
  const master = await requireMaster();
  if (!master) redirect('/select-org');

  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/master/hospitals?error=missing_id');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/master/hospitals/${id}/edit?error=no_file`);
  }
  const result = await uploadHospitalImage({
    hospitalId: id,
    purpose: 'gallery',
    file: file as File,
  });
  if (!result.ok) {
    redirect(`/master/hospitals/${id}/edit?error=${encodeURIComponent(result.error)}`);
  }

  const [existing] = await db
    .select({
      galleryImageUrls: hospitals.galleryImageUrls,
      organizationId: hospitals.organizationId,
    })
    .from(hospitals)
    .where(eq(hospitals.id, id))
    .limit(1);
  if (!existing) redirect('/master/hospitals?error=hospital_not_found');

  const next = [...((existing.galleryImageUrls ?? []) as string[]), result.url];
  await db
    .update(hospitals)
    .set({ galleryImageUrls: next, updatedAt: new Date() })
    .where(eq(hospitals.id, id));

  revalidateClinicSurfaces();
  redirect(`/master/hospitals/${id}/edit?saved=1`);
}

/** @deprecated Use removeLocaleGalleryImage. */
export async function removeGalleryImage(formData: FormData): Promise<void> {
  const master = await requireMaster();
  if (!master) redirect('/select-org');

  const id = String(formData.get('id') ?? '');
  const url = String(formData.get('url') ?? '');
  if (!id || !url) redirect('/master/hospitals?error=missing_fields');

  const [existing] = await db
    .select({
      galleryImageUrls: hospitals.galleryImageUrls,
      organizationId: hospitals.organizationId,
    })
    .from(hospitals)
    .where(eq(hospitals.id, id))
    .limit(1);
  if (!existing) redirect('/master/hospitals?error=hospital_not_found');

  const current = (existing.galleryImageUrls ?? []) as string[];
  const next = current.filter((u) => u !== url);
  await db
    .update(hospitals)
    .set({ galleryImageUrls: next, updatedAt: new Date() })
    .where(eq(hospitals.id, id));

  await deleteHospitalImageByUrl(url);

  revalidateClinicSurfaces();
  redirect(`/master/hospitals/${id}/edit?saved=1`);
}

// Silence unused warnings for legacy SQL helper.
void sql;
