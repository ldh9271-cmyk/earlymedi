'use server';

import 'server-only';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { auditLogs } from '@/drizzle/schema/audit';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import {
  uploadHospitalImage,
  deleteHospitalImageByUrl,
} from '@/lib/storage/hospital-images';

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

/**
 * Save the small bits (cover URL + notes) without touching the gallery.
 * Form-driven from the main edit page card.
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

/**
 * Upload (or replace) the hospital's cover image. The previous cover,
 * if any, is best-effort deleted from Storage so the bucket doesn't
 * accumulate orphans.
 *
 * 10 MB per file, image/* MIME types only — enforced both client-side
 * (`accept="image/*"`) and server-side (storage helper).
 */
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

  await db
    .insert(auditLogs)
    .values({
      organizationId: existing.organizationId,
      actorUserId: master.userId,
      action: 'update',
      entityType: 'hospital',
      entityId: id,
      diff: { coverImageUrl: result.url, previousUrl },
      metadata: { isMaster: true, source: 'master_console', kind: 'hospital_cover_upload' },
    })
    .catch(() => {});

  revalidateClinicSurfaces();
  redirect(`/master/hospitals/${id}/edit?saved=1`);
}

/**
 * Remove the cover image entirely. Useful to revert to the gradient
 * placeholder. Best-effort cleanup of the Storage object.
 */
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

/**
 * Upload (or replace) the long-form landing image — a tall promotional
 * poster shown inside the "오늘의 추천 병원" section. Mirrors the cover
 * upload action: previous landing image is best-effort deleted.
 */
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

  await db
    .insert(auditLogs)
    .values({
      organizationId: existing.organizationId,
      actorUserId: master.userId,
      action: 'update',
      entityType: 'hospital',
      entityId: id,
      diff: { landingImageUrl: result.url, previousUrl },
      metadata: { isMaster: true, source: 'master_console', kind: 'hospital_landing_upload' },
    })
    .catch(() => {});

  revalidateClinicSurfaces();
  redirect(`/master/hospitals/${id}/edit?saved=1`);
}

/**
 * Remove the landing image entirely.
 */
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

/**
 * Append one image to the hospital's gallery. Master can call this
 * repeatedly for multiple files — we don't accept `multiple` upload
 * in a single request to keep error handling per-file simple.
 */
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

  await db
    .insert(auditLogs)
    .values({
      organizationId: existing.organizationId,
      actorUserId: master.userId,
      action: 'update',
      entityType: 'hospital',
      entityId: id,
      diff: { addedUrl: result.url, total: next.length },
      metadata: { isMaster: true, source: 'master_console', kind: 'hospital_gallery_add' },
    })
    .catch(() => {});

  revalidateClinicSurfaces();
  redirect(`/master/hospitals/${id}/edit?saved=1`);
}

/**
 * Drop one gallery image by exact URL match. Storage object is
 * best-effort removed so we don't accumulate orphans.
 */
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
