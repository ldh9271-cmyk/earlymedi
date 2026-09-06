import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { hospitalRegistry, type RegistryDetails } from '@/drizzle/schema/hospital-registry';
import { sendAdminTelegram } from '@/lib/notify/admin-alert';
import { sendTripEmail } from '@/lib/ai/trip-planner';

/**
 * 병원 자체 등록 검수 — 콘솔에서 '검수 요청' 하면 submitted, 마스터가 1~2 영업일 내 승인/반려.
 * 승인 시 클레임도 함께 승인(컬러 카드)되고 profile 이 공개 상세에 그대로 노출된다.
 */
export function profileCompleteness(d: RegistryDetails): { ok: boolean; missing: string[] } {
  const p = d.profile ?? {};
  const missing: string[] = [];
  if ((p.intro ?? '').trim().length < 50) missing.push('병원 소개 50자 이상');
  if (!p.cover) missing.push('대표(썸네일) 사진');
  if (!d.docs?.businessLicense) missing.push('사업자등록증');
  return { ok: missing.length === 0, missing };
}

export async function markSubmitted(registryId: string, contactEmail: string, mode: 'self' | 'agency'): Promise<void> {
  const now = new Date().toISOString();
  const [row] = await db.select({ name: hospitalRegistry.name, details: hospitalRegistry.details }).from(hospitalRegistry).where(eq(hospitalRegistry.id, registryId)).limit(1);
  const prev = row?.details.submission;
  const submission = { ...(prev ?? {}), status: 'submitted' as const, mode, submittedAt: now, contactEmail, reviewNote: undefined };
  await db.execute(sql`update hospital_registry set details = coalesce(details,'{}'::jsonb) || ${JSON.stringify({ submission })}::jsonb, updated_at = now() where id = ${registryId}`);
  await sendAdminTelegram(`<b>📝 병원 등록 검수 요청</b>\n${esc(row?.name ?? '')} · ${mode === 'agency' ? '대행' : '직접 등록'}\n${esc(contactEmail)}\n→ 마스터 레지스트리 '병원 등록 검수' 에서 1~2 영업일 내 승인`).catch(() => false);
}

export async function approveSubmission(registryId: string, note?: string | null): Promise<{ ok: boolean; error?: string }> {
  const [row] = await db.select({ name: hospitalRegistry.name, ykiho: hospitalRegistry.ykiho, details: hospitalRegistry.details }).from(hospitalRegistry).where(eq(hospitalRegistry.id, registryId)).limit(1);
  if (!row) return { ok: false, error: '없는 병원' };
  const d = row.details;
  const p = d.profile ?? {};
  const now = new Date().toISOString();
  const submission = { ...(d.submission ?? {}), status: 'approved' as const, reviewedAt: now, reviewNote: note?.trim() || undefined };
  // 공개 상세가 읽는 레거시 키(intro·photos·languages)도 프로필로 맞춘다
  const legacy = {
    intro: p.intro ?? d.intro,
    photos: [p.cover, ...(p.photos ?? [])].filter((x): x is string => Boolean(x)),
    agency: d.agency ? { ...d.agency, status: 'done' as const } : undefined,
  };
  await db.execute(sql`update hospital_registry set claim_status = 'approved', details = coalesce(details,'{}'::jsonb) || ${JSON.stringify({ submission, ...Object.fromEntries(Object.entries(legacy).filter(([, v]) => v !== undefined)) })}::jsonb, updated_at = now() where id = ${registryId}`);
  const to = d.submission?.contactEmail;
  if (to) {
    await sendTripEmail(to, `[GlowUpTour] 병원 정보 등록이 승인되었습니다 · ${row.name}`,
      `<div style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#222"><h2 style="font-size:18px">등록이 승인되어 게시되었습니다</h2><p><b>${esc(row.name)}</b> 의 병원 공개 정보가 검수를 통과해 전국 병원 찾기에 컬러 카드로 노출됩니다.</p><p><a href="https://www.glowuptour.com/kr/clinics/r/${encodeURIComponent(row.ykiho)}">공개 페이지 열기</a></p>${note ? `<p style="color:#6a6a6a">${esc(note)}</p>` : ''}<p style="color:#6a6a6a;font-size:12px">GlowUpTour · glowuptour.com</p></div>`).catch(() => false);
  }
  return { ok: true };
}

export async function rejectSubmission(registryId: string, note: string): Promise<{ ok: boolean; error?: string }> {
  const [row] = await db.select({ name: hospitalRegistry.name, details: hospitalRegistry.details }).from(hospitalRegistry).where(eq(hospitalRegistry.id, registryId)).limit(1);
  if (!row) return { ok: false, error: '없는 병원' };
  const submission = { ...(row.details.submission ?? {}), status: 'rejected' as const, reviewedAt: new Date().toISOString(), reviewNote: note.trim().slice(0, 500) };
  await db.execute(sql`update hospital_registry set details = coalesce(details,'{}'::jsonb) || ${JSON.stringify({ submission })}::jsonb, updated_at = now() where id = ${registryId}`);
  const to = row.details.submission?.contactEmail;
  if (to) {
    await sendTripEmail(to, `[GlowUpTour] 병원 정보 등록 보완 요청 · ${row.name}`,
      `<div style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#222"><h2 style="font-size:18px">보완이 필요합니다</h2><p><b>${esc(row.name)}</b> 등록 내용을 검수한 결과 아래 사항을 보완해 다시 검수 요청해 주세요.</p><p style="background:#fff5f7;padding:12px;border-radius:8px">${esc(note)}</p><p><a href="https://www.glowuptour.com/medical/registry">병원 공개 정보 편집</a></p><p style="color:#6a6a6a;font-size:12px">GlowUpTour · glowuptour.com</p></div>`).catch(() => false);
  }
  return { ok: true };
}

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c);
}
