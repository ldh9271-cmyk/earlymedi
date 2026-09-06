'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, inArray } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { db } from '@/lib/db/client';
import { hospitalRegistry, type RegistryDetails } from '@/drizzle/schema/hospital-registry';
import { REGISTRY_LANGS } from './langs';

/**
 * 병원이 직접 등록(클레임 승인)한 레지스트리 행의 소개·언어·사진을 저장한다.
 * 공공 필드(주소·전화·진료시간 등)는 심평원 원천이라 여기서 바꾸지 않는다.
 */
export async function saveRegistryProfileAction(fd: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const [row] = await db
    .select({ id: hospitalRegistry.id, details: hospitalRegistry.details, claimStatus: hospitalRegistry.claimStatus })
    .from(hospitalRegistry)
    .where(eq(hospitalRegistry.claimOrgId, ctx.orgId))
    .limit(1);
  if (!row) redirect('/medical/registry?error=' + encodeURIComponent('연결된 병원이 없습니다'));
  if (row.claimStatus !== 'approved') redirect('/medical/registry?error=' + encodeURIComponent('마스터 승인 후 편집할 수 있습니다'));

  const intro = String(fd.get('intro') ?? '').trim().slice(0, 2000);
  const languages = REGISTRY_LANGS.filter((l) => fd.get(`lang_${l}`) === 'on');
  const photos = String(fd.get('photos') ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\/\S+$/i.test(s))
    .slice(0, 12);

  const merged: RegistryDetails = { ...row.details, intro: intro || undefined, languages, photos };
  await db.update(hospitalRegistry)
    .set({ details: merged, updatedAt: new Date() })
    .where(and(eq(hospitalRegistry.id, row.id), eq(hospitalRegistry.claimOrgId, ctx.orgId)));
  revalidatePath('/medical/registry');
  redirect('/medical/registry?ok=1');
}


/** 콘솔에서 레지스트리 병원을 '우리 병원' 으로 연결 요청 (마스터 승인 대기). 조직당 1곳. */
export async function claimHospitalFromConsoleAction(fd: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['medical'] });
  const registryId = String(fd.get('registryId') ?? '');
  if (!registryId) redirect('/medical/registry?error=' + encodeURIComponent('선택이 필요합니다'));
  const [mine] = await db.select({ id: hospitalRegistry.id }).from(hospitalRegistry).where(eq(hospitalRegistry.claimOrgId, ctx.orgId)).limit(1);
  if (mine) redirect('/medical/registry?error=' + encodeURIComponent('이미 연결(요청)된 병원이 있습니다'));
  await db.update(hospitalRegistry)
    .set({ claimOrgId: ctx.orgId, claimStatus: 'pending', claimedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(hospitalRegistry.id, registryId), inArray(hospitalRegistry.claimStatus, ['none', 'rejected'])));
  revalidatePath('/medical/registry');
  redirect('/medical/registry?ok=claimed');
}
