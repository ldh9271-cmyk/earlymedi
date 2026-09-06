'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { notifyOrderEvent } from '@/lib/notify/admin-alert';
import { onTripOrderPaid } from '@/lib/ai/trip-workflow';
import { declareFinalAmount, masterSetSettlementStatus, type SettlementStatus } from '@/lib/voucher/settlement';
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

/** QR 3자 검증 정산 상태 전환 — 이의 조정 후 확정, 수수료 청구/입금 표시, 되돌리기. */
export async function setMerchantSettlementStatusAction(formData: FormData): Promise<void> {
  await assertMaster();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as SettlementStatus;
  if (!id || !['declared', 'confirmed', 'disputed', 'invoiced', 'paid'].includes(status)) redirect('/master/orders?error=bad_settlement_status');
  const row = await masterSetSettlementStatus(id, status);
  if (!row) redirect(`/master/orders?error=${encodeURIComponent('정산 기록이 없는 주문입니다')}`);
  revalidatePath('/master/orders');
  redirect('/master/orders');
}

/** 가맹점이 금액을 안 넣었을 때 운영자가 대신 최종 결제금액을 기록/정정. */
export async function masterDeclareSettlementAction(formData: FormData): Promise<void> {
  await assertMaster();
  const id = String(formData.get('id') ?? '');
  const amount = Math.round(Number(String(formData.get('finalAmountWon') ?? '').replace(/[^\d]/g, '')));
  if (!id) redirect('/master/orders?error=missing_id');
  if (!Number.isFinite(amount) || amount < 0) redirect(`/master/orders?error=${encodeURIComponent('최종 결제금액을 입력해 주세요')}`);
  const [order] = await db.select().from(checkoutOrders).where(eq(checkoutOrders.id, id)).limit(1);
  if (!order) redirect('/master/orders?error=not_found');
  const r = await declareFinalAmount(order, { id: 'master', name: '글로우업투어 운영', isMaster: true }, { finalAmountWon: amount, note: String(formData.get('note') ?? '') || null });
  if (!r.ok) {
    const msg: Record<string, string> = { not_checked_in: '방문 확인(QR 스캔)이 먼저 필요합니다', locked: '이미 청구·입금된 건입니다', not_paid: '결제 완료 주문만 가능합니다', cancelled: '취소된 주문입니다', bad_amount: '금액이 올바르지 않습니다', forbidden: '권한이 없습니다' };
    redirect(`/master/orders?error=${encodeURIComponent(msg[r.reason] ?? r.reason)}`);
  }
  revalidatePath('/master/orders');
  redirect('/master/orders');
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
    const [o] = await db
      .select({
        invoiceNo: checkoutOrders.invoiceNo, listingTitle: checkoutOrders.listingTitle,
        totalWon: checkoutOrders.totalWon, userEmail: checkoutOrders.userEmail,
      })
      .from(checkoutOrders).where(eq(checkoutOrders.id, id)).limit(1);
    if (o) {
      await notifyOrderEvent('paid_manual', {
        invoiceNo: o.invoiceNo, listingTitle: o.listingTitle,
        totalWon: o.totalWon, userEmail: o.userEmail,
      }).catch(() => false);
    }
    // AI 여행 견적 인보이스면 일정을 '스케줄 완성'으로 올리고 고객에게 안내 메일
    await onTripOrderPaid(id).catch(() => undefined);
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

/**
 * 예약 확정 — 예약금 입금이 확인된 주문에 대해, 운영자가 해당
 * 날짜·시간 예약 가능 여부를 파트너와 확인한 뒤 누른다. 불가하면
 * 이 버튼 대신 고객 연락처로 일정을 조율하고 날짜 변경 후 확정한다.
 */
export async function confirmReservationAction(formData: FormData): Promise<void> {
  await assertMaster();
  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/master/orders?error=missing_id');
  try {
    const [order] = await db
      .select({ id: checkoutOrders.id, status: checkoutOrders.status, meta: checkoutOrders.meta })
      .from(checkoutOrders)
      .where(eq(checkoutOrders.id, id))
      .limit(1);
    if (!order) redirect('/master/orders?error=not_found');
    if (order.status !== 'paid') {
      redirect(`/master/orders?error=${encodeURIComponent('예약금 입금 확인(paid) 후 확정할 수 있습니다')}`);
    }
    await db
      .update(checkoutOrders)
      .set({
        meta: { ...(order.meta ?? {}), reserveConfirmedAt: new Date().toISOString() },
        updatedAt: new Date(),
      })
      .where(eq(checkoutOrders.id, order.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'confirm_failed';
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
