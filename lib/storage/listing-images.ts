import 'server-only';
import { createSupabaseServiceClient } from '@/lib/auth/supabase-server';

/**
 * Upload an image to the `listing-images` Supabase Storage bucket.
 * Mirrors lib/storage/hospital-images.ts — same constraints (10MB,
 * image/* MIME) and same path layout:
 *
 *   <listingId>/<purpose>/<timestamp>-<rand>.<ext>          (base)
 *   <listingId>/<locale>/<purpose>/<timestamp>-<rand>.<ext> (per-locale)
 *
 * Service-role only — never exposed to the browser. Bucket is
 * created public=true by drizzle/sql/partner-listings.sql so the
 * returned URL is directly renderable in <img>.
 */
export async function uploadListingImage({
  listingId,
  purpose,
  file,
  locale,
}: {
  listingId: string;
  purpose: 'cover' | 'gallery';
  file: File;
  locale?: 'kr' | 'en' | 'zh' | 'ja';
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!file || file.size === 0) return { ok: false, error: 'empty_file' };
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: 'file_too_large_10mb' };
  if (!/^image\//.test(file.type)) return { ok: false, error: 'not_an_image' };

  const ext = (() => {
    if (file.type === 'image/jpeg') return 'jpg';
    if (file.type === 'image/png') return 'png';
    if (file.type === 'image/webp') return 'webp';
    if (file.type === 'image/gif') return 'gif';
    const last = file.name.split('.').pop();
    return last && last.length <= 5 ? last.toLowerCase() : 'jpg';
  })();
  const rand = Math.random().toString(36).slice(2, 8);
  const path = locale
    ? `${listingId}/${locale}/${purpose}/${Date.now()}-${rand}.${ext}`
    : `${listingId}/${purpose}/${Date.now()}-${rand}.${ext}`;

  try {
    const svc = createSupabaseServiceClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await svc.storage
      .from('listing-images')
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });
    if (error) return { ok: false, error: error.message };

    const { data } = svc.storage.from('listing-images').getPublicUrl(path);
    if (!data?.publicUrl) return { ok: false, error: 'no_public_url' };
    return { ok: true, url: data.publicUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown_upload_error' };
  }
}
