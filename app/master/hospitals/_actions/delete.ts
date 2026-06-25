'use server';

import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { categoryListings } from '@/drizzle/schema/category-listings';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';

/**
 * 마스터가 병원을 cross-org 로 삭제 — 3 테이블 cascade.
 *
 *   form fields: id (uuid)
 *   삭제 대상: hospitals + category_listings (hospitalId 매칭) +
 *             partner_listings (category=hospital & details->hospitalId 매칭)
 *
 * 에이전시용 deleteHospitalAction 과 동일한 cascade 지만 org 소유권
 * 체크를 하지 않음 (마스터는 글로벌 운영자).
 */
export async function deleteHospitalMasterAction(formData: FormData): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?next=/master/hospitals');
  if (!isMasterEmail(auth.user.email ?? null)) redirect('/select-org');

  const id = String(formData.get('id') ?? '').trim();
  if (!id) redirect('/master/hospitals?error=missing_id');

  const row = await db
    .select({ id: hospitals.id })
    .from(hospitals)
    .where(eq(hospitals.id, id))
    .limit(1);
  if (row.length === 0) redirect('/master/hospitals?error=not_found');

  await db.delete(categoryListings).where(eq(categoryListings.hospitalId, id));
  await db
    .delete(partnerListings)
    .where(
      and(
        eq(partnerListings.category, 'hospital'),
        sql`${partnerListings.details}->>'hospitalId' = ${id}`,
      ),
    );
  await db.delete(hospitals).where(eq(hospitals.id, id));

  revalidatePath('/master/hospitals');
  revalidatePath('/agency/hospitals');
  revalidatePath('/kr/clinics', 'layout');
  redirect('/master/hospitals?deleted=ok');
}
