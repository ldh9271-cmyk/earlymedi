'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import {
  accrueOrderTravelMargin,
  reverseOrder,
  settleOrderHospitalFeeActual,
  stampOrderHospitalFee,
} from '@/lib/referral/service';

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
    // 총판 귀속 회원: 여행 패키지면 판매금액 마진을 적립하고, 의료상품이면
    // 진료과·요율만 스탬프한다 — 수수료 원장은 병원 실결제액 확정 시 생성
    await accrueOrderTravelMargin(id).catch(() => 0);
    await stampOrderHospitalFee(id).catch(() => false);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'update_failed';
    if (msg.includes('NEXT_REDIRECT')) throw err;
    redirect(`/master/orders?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath('/master/orders');
  redirect('/master/orders');
}

/**
 * 병원 실결제액 확정 — 의료상품 주문의 수수료 정산 기준 입력.
 *
 * 플랫폼 결제액이 아니라 환자가 병원에서 실제로 결제한 금액이
 * 수수료 기준이다. 이 액션이 원장을 만든다 (재입력 = 정정 재정산).
 */
export async function settleHospitalActualAction(formData: FormData): Promise<void> {
  await assertMaster();
  const id = String(formData.get('id') ?? '');
  const actualAmountWon = Math.round(Number(formData.get('actualAmountWon') ?? 0));
  const procedureYmd = String(formData.get('procedureYmd') ?? '') || null;
  if (!id) redirect('/master/orders?error=missing_id');
  if (!Number.isFinite(actualAmountWon) || actualAmountWon <= 0) {
    redirect(`/master/orders?error=${encodeURIComponent('실결제액을 입력해 주세요')}`);
  }
  try {
    await settleOrderHospitalFeeActual({ orderId: id, actualAmountWon, procedureYmd });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'settle_failed';
    if (msg.includes('NEXT_REDIRECT')) throw err;
    redirect(`/master/orders?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath('/master/orders');
  redirect('/master/orders');
}

export async function cancelOrderAction(formData: FormData): Promise<void> {
  await assertMaster();
  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/master/orders?error=missing_id');
  try {
    // 적립된 마진이 있으면 함께 환수하고 주문을 취소한다.
    // reverseOrder 는 원장 환수 + 주문 상태를 cancelled 로 바꾼다.
    await reverseOrder(id, '주문 취소');
    // 마진 행이 없던 주문(귀속 없음 등)도 확실히 취소 처리
    await db
      .update(checkoutOrders)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(checkoutOrders.id, id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'update_failed';
    if (msg.includes('NEXT_REDIRECT')) throw err;
    redirect(`/master/orders?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath('/master/orders');
  redirect('/master/orders');
}
