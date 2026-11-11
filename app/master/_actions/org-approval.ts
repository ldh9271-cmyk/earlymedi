'use server';

import 'server-only';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { organizations } from '@/drizzle/schema/organizations';
import { auditLogs } from '@/drizzle/schema/audit';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';

/**
 * 사업자 계정 승인 · 병원 연결 (마스터 전용) — 2026-11-11.
 *
 *  - 병원이 /biz 에서 의료기관 조직을 만들면 마스터가 큐레이션 병원 행(hospitals)과 조직을 `linked_org_id` 로 잇고
 *    조직을 verified 로 승인한다. 연결되면 /medical 콘솔(RLS hospitals_linked_read)·상담원 채팅·QR 방문 확인이 그 조직에 붙고,
 *    승인된 사업자 계정은 마이페이지(/me)에서 콘솔로 바로 이동한다(app/api/auth/enter-console).
 *  - 단일 행 UPDATE 만 쓴다.
 */
const VERIFICATION = ['unverified', 'documents_submitted', 'in_review', 'verified', 'rejected'] as const;
type Verification = (typeof VERIFICATION)[number];

async function requireMaster(): Promise<string> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || !isMasterEmail(auth.user.email ?? null)) redirect('/select-org');
  return auth.user.id;
}

/** 병원 편집 화면: 조직 연결(+승인) / 연결 해제. hospitalId · orgId('' 이면 해제) · approve('1') */
export async function linkHospitalOrgAction(formData: FormData): Promise<void> {
  const actor = await requireMaster();
  const hospitalId = String(formData.get('hospitalId') ?? '');
  const orgId = String(formData.get('orgId') ?? '').trim();
  const approve = String(formData.get('approve') ?? '') === '1';
  const lng = String(formData.get('lng') ?? 'kr');
  if (!/^[0-9a-f-]{36}$/i.test(hospitalId)) redirect('/master/hospitals?error=missing_id');
  // 명시적 타입 선언이어야 never 반환으로 제어 흐름이 좁혀진다
  const back: (q: string) => never = (q) => redirect(`/master/hospitals/${hospitalId}/edit?lng=${lng}&${q}`);
  if (orgId === '') {
    await db.update(hospitals).set({ linkedOrgId: null, updatedAt: new Date() }).where(eq(hospitals.id, hospitalId));
    await db.insert(auditLogs).values({ organizationId: null, actorUserId: actor, action: 'update', entityType: 'hospital', entityId: hospitalId, diff: { linkedOrgId: null }, metadata: { reason: 'master_unlink_org' } }).catch(() => undefined);
    revalidatePath('/master/hospitals');
    back('saved=1');
  }
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) back(`error=${encodeURIComponent('조직을 선택해 주세요')}`);
  const [org] = await db.select({ id: organizations.id, accountType: organizations.accountType, name: organizations.name }).from(organizations).where(and(eq(organizations.id, orgId), eq(organizations.isActive, true))).limit(1);
  if (!org) back(`error=${encodeURIComponent('조직을 찾을 수 없습니다')}`);
  if (org.accountType !== 'medical') back(`error=${encodeURIComponent('의료기관 조직만 병원에 연결할 수 있습니다')}`);
  await db.update(hospitals).set({ linkedOrgId: org.id, updatedAt: new Date() }).where(eq(hospitals.id, hospitalId));
  if (approve) await db.update(organizations).set({ verificationStatus: 'verified', updatedAt: new Date() }).where(eq(organizations.id, org.id));
  await db.insert(auditLogs).values({ organizationId: org.id, actorUserId: actor, action: 'update', entityType: 'hospital', entityId: hospitalId, diff: { linkedOrgId: org.id, approved: approve }, metadata: { reason: 'master_link_org' } }).catch(() => undefined);
  revalidatePath('/master/hospitals');
  revalidatePath(`/master/orgs/${org.id}`);
  back('saved=1');
}

/** 조직 관리 화면: 승인 상태 변경 */
export async function setOrgVerificationAction(formData: FormData): Promise<void> {
  const actor = await requireMaster();
  const orgId = String(formData.get('orgId') ?? '');
  const status = String(formData.get('status') ?? '') as Verification;
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) redirect('/master');
  if (!VERIFICATION.includes(status)) redirect(`/master/orgs/${orgId}?error=${encodeURIComponent('상태값이 올바르지 않습니다')}`);
  await db.update(organizations).set({ verificationStatus: status, updatedAt: new Date() }).where(eq(organizations.id, orgId));
  await db.insert(auditLogs).values({ organizationId: orgId, actorUserId: actor, action: 'update', entityType: 'organization', entityId: orgId, diff: { verificationStatus: status }, metadata: { reason: 'master_set_verification' } }).catch(() => undefined);
  revalidatePath(`/master/orgs/${orgId}`);
  revalidatePath('/master/members');
  redirect(`/master/orgs/${orgId}?saved=1`);
}
