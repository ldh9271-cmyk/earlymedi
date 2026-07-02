'use server';

import 'server-only';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';

/**
 * partner_listings 노출 순서 수정 — 마스터 전용. 낮을수록 먼저.
 *
 *   form fields: id (uuid), sortOrder (int)
 *   유효 범위: 0 ~ 9999. 비숫자 → 100 fallback.
 *   revalidate: /master/listings + 공개 표면 (/kr, /kr/glowup/*)
 *
 * /master/hospitals 의 updateHospitalSortOrderAction 과 동일 패턴.
 */
export async function updateListingSortOrderAction(formData: FormData): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login?next=/master/listings');
  if (!isMasterEmail(auth.user.email ?? null)) redirect('/select-org');

  const id = String(formData.get('id') ?? '').trim();
  if (!id) redirect('/master/listings?error=missing_id');

  const raw = Number(formData.get('sortOrder'));
  const sortOrder =
    Number.isFinite(raw) && raw >= 0 && raw <= 9999 ? Math.round(raw) : 100;

  await db
    .update(partnerListings)
    .set({ sortOrder, updatedAt: new Date() })
    .where(eq(partnerListings.id, id));

  revalidatePath('/master/listings');
  revalidatePath('/agency/listings');
  revalidatePath('/kr', 'layout');
  revalidatePath('/en', 'layout');
  revalidatePath('/zh', 'layout');
  revalidatePath('/ja', 'layout');
  revalidatePath('/ru', 'layout');
  revalidatePath('/vi', 'layout');
  redirect('/master/listings?sort=ok');
}
