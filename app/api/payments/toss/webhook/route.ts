import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { fetchTossPayment, tossConfigured } from '@/lib/payments/toss';
import { accrueOrderTravelMargin, reverseOrder, stampOrderHospitalFee } from '@/lib/referral/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

/**
 * 토스 웹훅 (PAYMENT_STATUS_CHANGED) — 취소·망취소 등 confirm 경로
 * 밖에서 바뀐 상태를 동기화한다.
 *
 * 토스 웹훅에는 서명이 없어 페이로드를 믿지 않는다. paymentKey 로 토스
 * API 를 다시 조회해 그 결과로만 상태를 바꾼다. 등록: 토스 개발자센터 →
 * 웹훅 → https://www.glowuptour.com/api/payments/toss/webhook
 *
 * 항상 200 을 돌려준다 (우리 쪽 처리 실패로 토스가 재시도 폭주하지
 * 않도록; 조회 실패는 다음 상태 변경이나 confirm 이 다시 맞춘다).
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (!tossConfigured()) return NextResponse.json({ ok: true, skipped: 'not_configured' });

  let paymentKey = '';
  try {
    const body = (await req.json()) as { data?: { paymentKey?: string } };
    paymentKey = body.data?.paymentKey ?? '';
  } catch {
    return NextResponse.json({ ok: true, skipped: 'bad_payload' });
  }
  if (!paymentKey) return NextResponse.json({ ok: true, skipped: 'no_payment_key' });

  const payment = await fetchTossPayment(paymentKey);
  if (!payment.ok || !payment.orderId) {
    return NextResponse.json({ ok: true, skipped: 'lookup_failed' });
  }

  try {
    const [order] = await db
      .select({ id: checkoutOrders.id, status: checkoutOrders.status, meta: checkoutOrders.meta })
      .from(checkoutOrders)
      .where(eq(checkoutOrders.invoiceNo, payment.orderId))
      .limit(1);
    if (!order) return NextResponse.json({ ok: true, skipped: 'order_not_found' });

    if (payment.status === 'DONE' && order.status !== 'paid') {
      await db
        .update(checkoutOrders)
        .set({
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date(),
          paymentMethod: 'toss:' + (payment.method ?? 'card'),
          meta: { ...order.meta, tossPaymentKey: paymentKey },
        })
        .where(eq(checkoutOrders.id, order.id));
      // confirm 경로와 같은 규칙: 여행 마진 적립 + 의료상품 요율 스탬프 (멱등)
      await accrueOrderTravelMargin(order.id).catch(() => 0);
      await stampOrderHospitalFee(order.id).catch(() => false);
    } else if (
      (payment.status === 'CANCELED' || payment.status === 'PARTIAL_CANCELED' || payment.status === 'ABORTED' || payment.status === 'EXPIRED')
      && order.status !== 'cancelled'
    ) {
      await db
        .update(checkoutOrders)
        .set({
          meta: { ...order.meta, tossPaymentKey: paymentKey, tossCancelStatus: payment.status },
        })
        .where(eq(checkoutOrders.id, order.id));
      // 주문을 cancelled 로 바꾸고, 이미 적립된 수당(여행 마진 등)이 있으면
      // 함께 환수한다 — 지급 전이면 reversed, 지급 후면 음수 행으로 차감.
      await reverseOrder(order.id, `토스 ${payment.status}`).catch(() => 0);
    }
  } catch {
    /* 다음 웹훅/조회에서 다시 맞춘다 */
  }
  return NextResponse.json({ ok: true });
}
