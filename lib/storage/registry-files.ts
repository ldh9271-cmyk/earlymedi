import 'server-only';
import { createHash } from 'node:crypto';
import { createSupabaseServiceClient } from '@/lib/auth/supabase-server';

/**
 * 레지스트리 병원(콘솔 자체 등록) 파일 저장.
 *  - 사진: 공개 버킷 hospital-images, 경로 registry/<ykiho 해시>/<cover|gallery>/…  → 공개 URL
 *  - 서류(사업자등록증·외국인환자유치기관 등록증): 비공개 버킷 hospital-docs → 경로만 저장,
 *    마스터 검수 화면에서 서명 URL(10분)로 연다. 버킷이 없으면 첫 업로드 때 만든다.
 */
const IMG_BUCKET = 'hospital-images';
const DOC_BUCKET = 'hospital-docs';
const MAX = 10 * 1024 * 1024;

export function registryKey(ykiho: string): string {
  return createHash('sha1').update(ykiho).digest('hex').slice(0, 16);
}

function extOf(file: File): string {
  const t = file.type;
  if (t === 'image/jpeg') return 'jpg';
  if (t === 'image/png') return 'png';
  if (t === 'image/webp') return 'webp';
  if (t === 'application/pdf') return 'pdf';
  const last = file.name.split('.').pop();
  return last && last.length <= 5 ? last.toLowerCase() : 'bin';
}

export async function uploadRegistryImage(opts: { ykiho: string; purpose: 'cover' | 'gallery'; file: File }): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { file } = opts;
  if (!file || file.size === 0) return { ok: false, error: 'empty_file' };
  if (file.size > MAX) return { ok: false, error: '사진은 10MB 이하' };
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return { ok: false, error: 'JPG·PNG·WebP 만 가능' };
  const path = `registry/${registryKey(opts.ykiho)}/${opts.purpose}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extOf(file)}`;
  try {
    const svc = createSupabaseServiceClient();
    const { error } = await svc.storage.from(IMG_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, cacheControl: '3600', upsert: false });
    if (error) return { ok: false, error: error.message };
    const { data } = svc.storage.from(IMG_BUCKET).getPublicUrl(path);
    return data?.publicUrl ? { ok: true, url: data.publicUrl } : { ok: false, error: 'no_public_url' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'upload_failed' };
  }
}

export async function uploadRegistryDoc(opts: { ykiho: string; kind: 'business' | 'foreign'; file: File }): Promise<{ ok: true; path: string; name: string; size: number } | { ok: false; error: string }> {
  const { file } = opts;
  if (!file || file.size === 0) return { ok: false, error: 'empty_file' };
  if (file.size > MAX) return { ok: false, error: '서류는 10MB 이하' };
  if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(file.type)) return { ok: false, error: 'PDF·JPG·PNG 만 가능' };
  const path = `registry/${registryKey(opts.ykiho)}/${opts.kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extOf(file)}`;
  try {
    const svc = createSupabaseServiceClient();
    const buf = Buffer.from(await file.arrayBuffer());
    let { error } = await svc.storage.from(DOC_BUCKET).upload(path, buf, { contentType: file.type, upsert: false });
    if (error && /not found|does not exist/i.test(error.message)) {
      await svc.storage.createBucket(DOC_BUCKET, { public: false, fileSizeLimit: MAX }).catch(() => null);
      ({ error } = await svc.storage.from(DOC_BUCKET).upload(path, buf, { contentType: file.type, upsert: false }));
    }
    if (error) return { ok: false, error: error.message };
    return { ok: true, path, name: file.name.slice(0, 120), size: file.size };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'upload_failed' };
  }
}

/** 비공개 서류 서명 URL (마스터 검수용) */
export async function signedDocUrl(path: string, expiresSec = 600): Promise<string | null> {
  try {
    const svc = createSupabaseServiceClient();
    const { data } = await svc.storage.from(DOC_BUCKET).createSignedUrl(path, expiresSec);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}
