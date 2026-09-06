'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { db } from '@/lib/db/client';
import { beautyRegistry, type BeautyDetails } from '@/drizzle/schema/beauty-registry';
import { REGISTRY_LANGS } from '@/app/medical/registry/langs';

/** 직접 등록(승인) 매장의 소개·언어·사진·영업시간·가격 안내 저장. 공공 필드는 행안부 원천이라 불변. */
export async function saveShopProfileAction(fd: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });
  const [row] = await db
    .select({ id: beautyRegistry.id, details: beautyRegistry.details, claimStatus: beautyRegistry.claimStatus })
    .from(beautyRegistry)
    .where(eq(beautyRegistry.claimOrgId, ctx.orgId))
    .limit(1);
  if (!row) redirect('/partner/registry?error=' + encodeURIComponent('연결된 매장이 없습니다'));
  if (row.claimStatus !== 'approved') redirect('/partner/registry?error=' + encodeURIComponent('마스터 승인 후 편집할 수 있습니다'));

  const intro = String(fd.get('intro') ?? '').trim().slice(0, 2000);
  const hours = String(fd.get('hours') ?? '').trim().slice(0, 200);
  const priceNote = String(fd.get('priceNote') ?? '').trim().slice(0, 300);
  const languages = REGISTRY_LANGS.filter((l) => fd.get(`lang_${l}`) === 'on');
  const photos = String(fd.get('photos') ?? '').split(/\r?\n/).map((s) => s.trim()).filter((s) => /^https?:\/\/\S+$/i.test(s)).slice(0, 12);

  const merged: BeautyDetails = { ...row.details, intro: intro || undefined, hours: hours || undefined, priceNote: priceNote || undefined, languages, photos };
  await db.update(beautyRegistry)
    .set({ details: merged, updatedAt: new Date() })
    .where(and(eq(beautyRegistry.id, row.id), eq(beautyRegistry.claimOrgId, ctx.orgId)));
  revalidatePath('/partner/registry');
  redirect('/partner/registry?ok=1');
}
