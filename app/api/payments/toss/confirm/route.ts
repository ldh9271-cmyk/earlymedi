import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { confirmTossPayment, tossConfigured } from '@/lib/payments/toss';
import { accrueOrderTravelMargin, stampOrderHospitalFee } from '@/lib/referral/service';
import { notifyOrderEvent } from '@/lib/notify/admin-alert';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

/**
 * 토스 결제 승인 — successUrl 리다이렉트 페이지가 호출한다.
 *
 * orderId 는 우리 인보이스 번호(GU-…)다. 금액은 쿼리로 넘어온 값이 아니라
 * DB 의 totalWon 으로 승인한다. 리다이렉트 파라미터의 amount 는 위변조
 * 감지용 대조에만 쓴다 — 다르면 승인 자체를 거부한다.
 */

const Schema = z.object({
  paymentKey: z.string().min(1).max(200),
  orderId: z.string().min(3).max(40),
  amount: z.number().int().min(0),
});

export async function POST(req: Request): Promise<NextResponse> {
  if (!tossConfigured()) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }
  let input: z.infer<typeof Schema>;
  try {
    input = Schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const [order] = await db
    .select({
      id: checkoutOrders.id,
      status: checkoutOrders.status,
      totalWon: checkoutOrders.totalWon,
      listingTitle: checkoutOrders.listingTitle,
      userEmail: checkoutOrders.userEmail,
      meta: checkoutOrders.meta,
    })
    .from(checkoutOrders)
    .where(eq(checkoutOrders.invoiceNo, input.orderId))
    .limit(1);
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // 이미 승인된 인보이스 — 새로고침/중복 호출은 성공으로 응답 (멱등)
  if (order.status === 'paid') return NextResponse.json({ ok: true, already: true });

  if (order.totalWon !== input.amount) {
    return NextResponse.json({ error: 'amount_mismatch' }, { status: 400 });
  }

  const result = await confirmTossPayment({
    paymentKey: input.paymentKey,
    orderId: input.orderId,
    amount: order.totalWon,
  });
  if (!result.ok || result.status !== 'DONE') {
    return NextResponse.json(
      { error: 'confirm_failed', code: result.errorCode ?? result.status ?? '' },
      { status: 502 },
    );
  }

  await db
    .update(checkoutOrders)
    .set({
      status: 'paid',
      paidAt: new Date(),
      updatedAt: new Date(),
      paymentMethod: 'toss:' + (result.method ?? 'card'),
      meta: {
        ...order.meta,
        tossPaymentKey: result.paymentKey ?? input.paymentKey,
        tossApprovedAt: result.approvedAt ?? '',
      },
    })
    .where(eq(checkoutOrders.id, order.id));

  // 총판 귀속 회원의 여행 패키지 결제면 총판 마진(예비 적립)을,
  // 의료상품 결제면 병원 수수료(총판 배분율 적용)를 만든다.
  // 관리자 수동 paid 처리(/master/orders)와 같은 규칙 — 멱등이라 안전.
  await accrueOrderTravelMargin(order.id).catch(() => 0);
  await stampOrderHospitalFee(order.id).catch(() => false);

  await notifyOrderEvent('paid', {
    invoiceNo: input.orderId, listingTitle: order.listingTitle, totalWon: order.totalWon,
    userEmail: order.userEmail, method: 'toss:' + (result.method ?? 'card'),
  }).catch(() => false);

  return NextResponse.json({ ok: true });
}
