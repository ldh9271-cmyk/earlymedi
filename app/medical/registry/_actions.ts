'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { db } from '@/lib/db/client';
import { hospitalRegistry, type RegistryDetails, type RegistryDoc, type RegistryHours, type RegistryProfile } from '@/drizzle/schema/hospital-registry';
import { uploadRegistryDoc, uploadRegistryImage } from '@/lib/storage/registry-files';
import { createAgencyOrder } from '@/lib/registry/agency';
import { markSubmitted, profileCompleteness } from '@/lib/registry/submission';
import { REGISTRY_LANGS } from './langs';

const back = (q: Record<string, string>): never => redirect(`/medical/registry?${new URLSearchParams(q).toString()}`);

async function myRow(orgId: string) {
  const [row] = await db.select().from(hospitalRegistry).where(eq(hospitalRegistry.claimOrgId, orgId)).limit(1);
  return row ?? null;
}

async function patchDetails(id: string, patch: Record<string, unknown>): Promise<void> {
  await db.execute(sql`update hospital_registry set details = coalesce(details,'{}'::jsonb) || ${JSON.stringify(patch)}::jsonb, updated_at = now() where id = ${id}`);
}

/** 등록 방식: 직접 등록 */
export async function chooseSelfModeAction(): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const row = await myRow(ctx.orgId);
  if (!row) back({ error: '연결된 병원이 없습니다' });
  const submission = { ...(row!.details.submission ?? { status: 'draft' }), mode: 'self' };
  await patchDetails(row!.id, { submission });
  revalidatePath('/medical/registry');
  back({ ok: 'self' });
}

/** 등록 방식: 플랫폼 대행 — 인보이스 발행 후 결제 버튼 노출 */
export async function requestAgencyAction(): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const row = await myRow(ctx.orgId);
  if (!row) back({ error: '연결된 병원이 없습니다' });
  try {
    await createAgencyOrder({ registryId: row!.id, ykiho: row!.ykiho, name: row!.name, orgId: ctx.orgId, userId: ctx.userId, userEmail: ctx.email });
  } catch (e) {
    back({ error: e instanceof Error ? e.message : '인보이스 발행 실패' });
  }
  revalidatePath('/medical/registry');
  back({ ok: 'agency' });
}

const lines = (v: unknown, max = 30): string[] => String(v ?? '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, max);
const hhmm = (v: unknown): string | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(v ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  if (h > 24 || Number(m[2]) > 59) return null;
  return `${String(h).padStart(2, '0')}${m[2]}`;
};
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/**
 * 병원 공개 정보 저장 (임시 저장 / 검수 요청). 글로우 인증 상세와 같은 구조의 프로필 + 사진 업로드 + 서류 첨부.
 * 공공 필드(주소·전화·진료과목)는 심평원 원천이라 여기서 바꾸지 않는다.
 */
export async function saveRegistryProfileAction(fd: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const row = await myRow(ctx.orgId);
  if (!row) back({ error: '연결된 병원이 없습니다' });
  const d: RegistryDetails = row!.details;
  const prev: RegistryProfile = d.profile ?? {};
  const errors: string[] = [];

  // ── 텍스트 필드 ──
  const s = (k: string, max = 300): string => String(fd.get(k) ?? '').trim().slice(0, max);
  const departments = lines(fd.get('departments')).map((l) => {
    const m = /^(.+?)\s*[:：|]\s*(.+)$/.exec(l);
    return m ? { title: (m[1] ?? '').trim(), items: (m[2] ?? '').split(/[·,、/]/).map((x) => x.trim()).filter(Boolean).slice(0, 12) } : { title: l, items: [] };
  });
  const doctors = lines(fd.get('doctors')).map((l) => {
    const m = /^(.+?)\s*[|\-–:：]\s*(.+)$/.exec(l);
    return m ? { name: (m[1] ?? '').trim(), role: (m[2] ?? '').trim() } : { name: l, role: '' };
  });
  const weekly: RegistryHours = {};
  let anyDay = false;
  for (const day of DAYS) {
    const a = hhmm(fd.get(`${day}_s`)); const b = hhmm(fd.get(`${day}_e`));
    if (a && b && a < b) { weekly[day] = [a, b]; anyDay = true; }
  }
  const ls = hhmm(fd.get('lunch_s')); const le = hhmm(fd.get('lunch_e'));
  if (ls && le && ls < le) { weekly.lunchWeek = `${ls}~${le}`; if (fd.get('lunchSatToo') === 'on') weekly.lunchSat = weekly.lunchWeek; }
  weekly.closedHoliday = fd.get('closedHoliday') === 'on' ? 'Y' : 'N';

  // ── 사진 ──
  const removeSet = new Set(fd.getAll('removePhoto').map(String));
  let cover = fd.get('removeCover') === 'on' ? undefined : prev.cover;
  let photos = (prev.photos ?? []).filter((u) => !removeSet.has(u));
  const coverFile = fd.get('cover');
  if (coverFile instanceof File && coverFile.size > 0) {
    const r = await uploadRegistryImage({ ykiho: row!.ykiho, purpose: 'cover', file: coverFile });
    if (r.ok) cover = r.url; else errors.push(`대표 사진: ${r.error}`);
  }
  const galleryFiles = fd.getAll('gallery').filter((f): f is File => f instanceof File && f.size > 0).slice(0, 12);
  for (const f of galleryFiles) {
    if (photos.length >= 12) break;
    const r = await uploadRegistryImage({ ykiho: row!.ykiho, purpose: 'gallery', file: f });
    if (r.ok) photos.push(r.url); else errors.push(`사진 ${f.name}: ${r.error}`);
  }
  photos = photos.slice(0, 12);

  // ── 서류 (비공개 버킷) ──
  const docs = { ...(d.docs ?? {}) };
  const biz = fd.get('businessLicense');
  if (biz instanceof File && biz.size > 0) {
    const r = await uploadRegistryDoc({ ykiho: row!.ykiho, kind: 'business', file: biz });
    if (r.ok) docs.businessLicense = { path: r.path, name: r.name, size: r.size, uploadedAt: new Date().toISOString() } satisfies RegistryDoc;
    else errors.push(`사업자등록증: ${r.error}`);
  }
  const fc = fd.get('foreignCert');
  if (fc instanceof File && fc.size > 0) {
    const r = await uploadRegistryDoc({ ykiho: row!.ykiho, kind: 'foreign', file: fc });
    if (r.ok) docs.foreignPatientCert = { path: r.path, name: r.name, size: r.size, uploadedAt: new Date().toISOString() } satisfies RegistryDoc;
    else errors.push(`유치기관 등록증: ${r.error}`);
  }

  const profile: RegistryProfile = {
    ...prev,
    tagline: s('tagline', 120) || undefined,
    intro: s('intro', 2000) || undefined,
    website: s('website', 200) || undefined,
    station: s('station', 200) || undefined,
    hoursText: s('hoursText', 300) || undefined,
    hoursWeekly: anyDay ? weekly : undefined,
    signatureProcedures: lines(fd.get('signature'), 12),
    departments,
    doctors,
    facilities: lines(fd.get('facilities'), 20),
    foreignNote: s('foreignNote', 300) || undefined,
    trust: lines(fd.get('trust'), 10),
    notice: s('notice', 500) || undefined,
    cover,
    photos,
  };
  const languages = REGISTRY_LANGS.filter((l) => fd.get(`lang_${l}`) === 'on');
  const patch: Record<string, unknown> = { profile, docs, languages };
  const sub = d.submission ?? { status: 'draft' as const };
  if (sub.status !== 'approved' && sub.status !== 'submitted') patch.submission = { ...sub, status: 'draft' };
  await patchDetails(row!.id, patch);

  const intent = String(fd.get('intent') ?? 'draft');
  if (intent === 'submit') {
    const fresh = await myRow(ctx.orgId);
    const check = profileCompleteness(fresh!.details);
    if (!check.ok) back({ error: `검수 요청 전에 채워 주세요: ${check.missing.join(', ')}${errors.length ? ` · ${errors.join(' · ')}` : ''}` });
    await markSubmitted(row!.id, ctx.email, fresh!.details.submission?.mode ?? 'self');
    revalidatePath('/medical/registry');
    back({ ok: 'submitted' });
  }
  revalidatePath('/medical/registry');
  if (errors.length) back({ ok: 'saved', error: errors.join(' · ') });
  back({ ok: 'saved' });
}

/** 콘솔에서 레지스트리 병원을 '우리 병원' 으로 연결 요청 (마스터 승인 대기). 조직당 1곳. */
export async function claimHospitalFromConsoleAction(fd: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const registryId = String(fd.get('registryId') ?? '');
  if (!registryId) back({ error: '선택이 필요합니다' });
  const [mine] = await db.select({ id: hospitalRegistry.id }).from(hospitalRegistry).where(eq(hospitalRegistry.claimOrgId, ctx.orgId)).limit(1);
  if (mine) back({ error: '이미 연결(요청)된 병원이 있습니다' });
  await db.update(hospitalRegistry)
    .set({ claimOrgId: ctx.orgId, claimStatus: 'pending', claimedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(hospitalRegistry.id, registryId), inArray(hospitalRegistry.claimStatus, ['none', 'rejected'])));
  revalidatePath('/medical/registry');
  back({ ok: 'claimed' });
}
