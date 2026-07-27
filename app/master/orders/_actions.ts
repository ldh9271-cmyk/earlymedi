'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';

/**
 * 인보이스 상태 전환 — 마스터 전용.
 *
 * 입금 확인(paid)은 알리페이 정산과 대조한 뒤 사람이 누르는 동작이다.
 * 게스트의 '결제를 완료했어요'(reported)만으로는 확정하지 않는다.
 */

async function assertMaster(): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  if (!isMasterEmail(auth.user.email ?? '')) redirect('/select-org');
}

export async function markOrderPaidAction(formData: FormData): Promise<void> {
  await assertMaster();
  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/master/orders?error=missing_id');
  try {
    await db
      .update(checkoutOrders)
      .set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() })
      .where(eq(checkoutOrders.id, id));
  } catch (err) {
    redirect(`/master/orders?error=${encodeURIComponent(err instanceof Error ? err.message : 'update_failed')}`);
  }
  revalidatePath('/master/orders');
  redirect('/master/orders');
}

export async function cancelOrderAction(formData: FormData): Promise<void> {
  await assertMaster();
  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/master/orders?error=missing_id');
  try {
    await db
      .update(checkoutOrders)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(checkoutOrders.id, id));
  } catch (err) {
    redirect(`/master/orders?error=${encodeURIComponent(err instanceof Error ? err.message : 'update_failed')}`);
  }
  revalidatePath('/master/orders');
  redirect('/master/orders');
}
