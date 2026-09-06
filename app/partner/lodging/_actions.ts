'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, inArray } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { db } from '@/lib/db/client';
import { lodgingRegistry, type LodgingDetails } from '@/drizzle/schema/lodging-registry';
import { REGISTRY_LANGS } from '@/app/medical/registry/langs';

/** 직접 등록(승인) 숙소의 소개·언어·사진·체크인/아웃·편의시설·가격 안내 저장. 공공 필드는 행안부 원천이라 불변. */
export async function saveStayProfileAction(fd: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  const [row] = await db
    .select({ id: lodgingRegistry.id, details: lodgingRegistry.details, claimStatus: lodgingRegistry.claimStatus })
    .from(lodgingRegistry)
    .where(eq(lodgingRegistry.claimOrgId, ctx.orgId))
    .limit(1);
  if (!row) redirect('/partner/lodging?error=' + encodeURIComponent('연결된 숙소가 없습니다'));
  if (row.claimStatus !== 'approved') redirect('/partner/lodging?error=' + encodeURIComponent('마스터 승인 후 편집할 수 있습니다'));

  const intro = String(fd.get('intro') ?? '').trim().slice(0, 2000);
  const checkIn = String(fd.get('checkIn') ?? '').trim().slice(0, 40);
  const checkOut = String(fd.get('checkOut') ?? '').trim().slice(0, 40);
  const priceNote = String(fd.get('priceNote') ?? '').trim().slice(0, 300);
  const amenities = String(fd.get('amenities') ?? '').split(/[,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 30);
  const languages = REGISTRY_LANGS.filter((l) => fd.get(`lang_${l}`) === 'on');
  const photos = String(fd.get('photos') ?? '').split(/\r?\n/).map((s) => s.trim()).filter((s) => /^https?:\/\/\S+$/i.test(s)).slice(0, 12);

  const merged: LodgingDetails = { ...row.details, intro: intro || undefined, checkIn: checkIn || undefined, checkOut: checkOut || undefined, priceNote: priceNote || undefined, amenities, languages, photos };
  await db.update(lodgingRegistry)
    .set({ details: merged, updatedAt: new Date() })
    .where(and(eq(lodgingRegistry.id, row.id), eq(lodgingRegistry.claimOrgId, ctx.orgId)));
  revalidatePath('/partner/lodging');
  redirect('/partner/lodging?ok=1');
}

/** 콘솔에서 숙박업 레지스트리 숙소를 '우리 숙소' 로 연결 요청 (마스터 승인 대기). */
export async function claimStayFromConsoleAction(fd: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  const registryId = String(fd.get('registryId') ?? '');
  if (!registryId) redirect('/partner/lodging?error=' + encodeURIComponent('선택이 필요합니다'));
  const [mine] = await db.select({ id: lodgingRegistry.id }).from(lodgingRegistry).where(eq(lodgingRegistry.claimOrgId, ctx.orgId)).limit(1);
  if (mine) redirect('/partner/lodging?error=' + encodeURIComponent('이미 연결(요청)된 숙소가 있습니다'));
  await db.update(lodgingRegistry)
    .set({ claimOrgId: ctx.orgId, claimStatus: 'pending', claimedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(lodgingRegistry.id, registryId), inArray(lodgingRegistry.claimStatus, ['none', 'rejected'])));
  revalidatePath('/partner/lodging');
  redirect('/partner/lodging?ok=claimed');
}
