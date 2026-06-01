import 'server-only';
import { createSupabaseServiceClient } from '@/lib/auth/supabase-server';

/**
 * Server-side helper: upload an image file to the `hospital-images`
 * Supabase Storage bucket and return its public URL.
 *
 * Service-role only — never expose to the browser. The bucket is
 * configured `public=true` (see drizzle/sql/hospital-images.sql) so
 * the returned URL is directly renderable in <img>.
 *
 * File-naming policy: `<hospitalId>/<purpose>/<timestamp>-<rand>.<ext>`
 *  - hospitalId scopes images per clinic so a clinic deletion cascade
 *    can target only its own assets.
 *  - purpose: 'cover' | 'gallery' — distinguishes Hero from gallery.
 *  - timestamp + rand: avoid name collisions; Storage will reject dupes
 *    even with `upsert:false` so randomization is mandatory.
 *  - extension: derived from MIME type; defaults to .jpg if unknown.
 */
export async function uploadHospitalImage({
  hospitalId,
  purpose,
  file,
}: {
  hospitalId: string;
  purpose: 'cover' | 'gallery';
  file: File;
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
  const path = `${hospitalId}/${purpose}/${Date.now()}-${rand}.${ext}`;

  try {
    const svc = createSupabaseServiceClient();
    // SSR client's storage API is identical to the browser one.
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await svc.storage
      .from('hospital-images')
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });
    if (error) return { ok: false, error: error.message };

    const { data } = svc.storage.from('hospital-images').getPublicUrl(path);
    if (!data?.publicUrl) return { ok: false, error: 'no_public_url' };
    return { ok: true, url: data.publicUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown_upload_error' };
  }
}

/**
 * Best-effort delete by URL. The public URL embeds the storage path
 * after `/storage/v1/object/public/hospital-images/` — we slice that
 * off and ask Storage to remove the object. A failed remove is
 * non-fatal; orphans get cleaned up by a sweeper job later.
 */
export async function deleteHospitalImageByUrl(url: string): Promise<void> {
  const marker = '/storage/v1/object/public/hospital-images/';
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  if (!path) return;
  try {
    const svc = createSupabaseServiceClient();
    await svc.storage.from('hospital-images').remove([path]);
  } catch {
    // ignore
  }
}
