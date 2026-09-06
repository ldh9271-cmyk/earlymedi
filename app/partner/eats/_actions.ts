'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, inArray } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { db } from '@/lib/db/client';
import { foodRegistry, type FoodDetails } from '@/drizzle/schema/food-registry';
import { REGISTRY_LANGS } from '@/app/medical/registry/langs';

/** 직접 등록(승인) 맛집의 소개·언어·사진·영업시간·대표메뉴·가격 안내 저장. 공공 필드는 행안부 원천이라 불변. */
export async function saveEatProfileAction(fd: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  const [row] = await db
    .select({ id: foodRegistry.id, details: foodRegistry.details, claimStatus: foodRegistry.claimStatus })
    .from(foodRegistry)
    .where(eq(foodRegistry.claimOrgId, ctx.orgId))
    .limit(1);
  if (!row) redirect('/partner/eats?error=' + encodeURIComponent('연결된 맛집이 없습니다'));
  if (row.claimStatus !== 'approved') redirect('/partner/eats?error=' + encodeURIComponent('마스터 승인 후 편집할 수 있습니다'));

  const intro = String(fd.get('intro') ?? '').trim().slice(0, 2000);
  const hours = String(fd.get('hours') ?? '').trim().slice(0, 200);
  const priceNote = String(fd.get('priceNote') ?? '').trim().slice(0, 300);
  const menu = String(fd.get('menu') ?? '').split(/[,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 30);
  const languages = REGISTRY_LANGS.filter((l) => fd.get(`lang_${l}`) === 'on');
  const photos = String(fd.get('photos') ?? '').split(/\r?\n/).map((s) => s.trim()).filter((s) => /^https?:\/\/\S+$/i.test(s)).slice(0, 12);

  const merged: FoodDetails = { ...row.details, intro: intro || undefined, hours: hours || undefined, priceNote: priceNote || undefined, menu, languages, photos };
  await db.update(foodRegistry)
    .set({ details: merged, updatedAt: new Date() })
    .where(and(eq(foodRegistry.id, row.id), eq(foodRegistry.claimOrgId, ctx.orgId)));
  revalidatePath('/partner/eats');
  redirect('/partner/eats?ok=1');
}

/** 콘솔에서 일반음식점 레지스트리 가게를 '우리 가게' 로 연결 요청 (마스터 승인 대기). */
export async function claimEatFromConsoleAction(fd: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  const registryId = String(fd.get('registryId') ?? '');
  if (!registryId) redirect('/partner/eats?error=' + encodeURIComponent('선택이 필요합니다'));
  const [mine] = await db.select({ id: foodRegistry.id }).from(foodRegistry).where(eq(foodRegistry.claimOrgId, ctx.orgId)).limit(1);
  if (mine) redirect('/partner/eats?error=' + encodeURIComponent('이미 연결(요청)된 맛집이 있습니다'));
  await db.update(foodRegistry)
    .set({ claimOrgId: ctx.orgId, claimStatus: 'pending', claimedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(foodRegistry.id, registryId), inArray(foodRegistry.claimStatus, ['none', 'rejected'])));
  revalidatePath('/partner/eats');
  redirect('/partner/eats?ok=claimed');
}
