'use server';

import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { categoryListings } from '@/drizzle/schema/category-listings';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { requireAccess } from '@/lib/auth/route-guards';

/**
 * 병원 삭제 — agency 권한 + 본인 org 소유의 행만 허용.
 *
 *   - category_listings · partner_listings(category='hospital',
 *     details.hospitalId == id) 미러 행도 함께 정리해 surfaces 에서
 *     깔끔하게 사라지도록.
 *   - hospitals 본행은 자식 테이블 FK ON DELETE CASCADE 로 doctors /
 *     referral_rates / deposit_policy 까지 자동 정리.
 *   - /agency/hospitals · /kr/clinics · /master/listings 캐시 무효화.
 */
export async function deleteHospitalAction(formData: FormData): Promise<void> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const id = String(formData.get('id') ?? '').trim();
  if (!id) redirect('/agency/hospitals?error=missing_id');

  // 본인 org 소유인지 확인.
  const row = await db
    .select({ id: hospitals.id })
    .from(hospitals)
    .where(and(eq(hospitals.id, id), eq(hospitals.organizationId, ctx.orgId)))
    .limit(1);
  if (row.length === 0) {
    redirect('/agency/hospitals?error=not_found_or_forbidden');
  }

  // 1) category_listings 정리.
  await db.delete(categoryListings).where(eq(categoryListings.hospitalId, id));

  // 2) partner_listings 중 details.hospitalId == id 인 미러 행 정리.
  //    JSONB ->> 텍스트 추출 후 비교.
  await db
    .delete(partnerListings)
    .where(
      and(
        eq(partnerListings.category, 'hospital'),
        sql`${partnerListings.details}->>'hospitalId' = ${id}`,
      ),
    );

  // 3) hospitals 본행 삭제.
  await db.delete(hospitals).where(eq(hospitals.id, id));

  revalidatePath('/agency/hospitals');
  revalidatePath('/kr/clinics', 'layout');
  revalidatePath('/master/listings');
  redirect('/agency/hospitals?deleted=ok');
}
