'use server';

import 'server-only';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { hospitals } from '@/drizzle/schema/hospitals';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';

/**
 * 병원 노출 순서 수정 — 마스터 전용. 낮을수록 먼저.
 *
 *   form fields: id (uuid), sortOrder (int)
 *   유효 범위: 0 ~ 9999. 음수/비숫자 → 100 으로 안전 fallback.
 *   /master/hospitals · /agency/hospitals · /kr/clinics 캐시 무효화.
 */
export async function updateHospitalSortOrderAction(formData: FormData): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?next=/master/hospitals');
  if (!isMasterEmail(auth.user.email ?? null)) redirect('/select-org');

  const id = String(formData.get('id') ?? '').trim();
  if (!id) redirect('/master/hospitals?error=missing_id');

  const raw = Number(formData.get('sortOrder'));
  const sortOrder =
    Number.isFinite(raw) && raw >= 0 && raw <= 9999 ? Math.round(raw) : 100;

  await db
    .update(hospitals)
    .set({ sortOrder, updatedAt: new Date() })
    .where(eq(hospitals.id, id));

  revalidatePath('/master/hospitals');
  revalidatePath('/agency/hospitals');
  revalidatePath('/kr/clinics', 'layout');
  redirect('/master/hospitals?sort=ok');
}
