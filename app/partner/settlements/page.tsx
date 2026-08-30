import { Wallet } from 'lucide-react';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { partnerBookings } from '@/drizzle/schema/partner-bookings';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { billingAccounts, billingPlans } from '@/drizzle/schema/billing';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { EmptyState } from '@/components/shared/empty-state';

export const metadata = { title: '정산' };
export const dynamic = 'force-dynamic';

function money(n: number, currency = 'KRW'): string {
  return currency === 'KRW' ? `₩${n.toLocaleString('ko-KR')}` : `${n.toLocaleString('ko-KR')} ${currency}`;
}

/**
 * 정산 — 협력업체가 받을 돈의 두 흐름을 한 화면에 모은다.
 *
 *  1. 부킹 (partner_bookings) — 에이전시 송객·직접 예약. completed 가
 *     정산 대상이고 confirmed 는 예정 파이프라인이다.
 *  2. 글로우업 상품 직판 (checkout_orders) — 우리 리스팅이 공개 포털에서
 *     팔려 입금 확인(paid)된 건. 상품가(subtotal) 기준으로 집계한다.
 *
 * 정산 수수료율은 플랜(billing_plans.settlement_fee_bp)을 그대로 보여주고,
 * 지급 주기·방식은 계약에 따르므로 여기서 단정하지 않는다.
 * partner_bookings 는 RLS 가 없어 organizationId 필터가 필수다.
 */
export default async function PartnerSettlementsPage(): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['non_medical'] });

  const { bookings, orders, account } = await withRls(ctx, async () => {
    const bookings = await db
      .select({
        id: partnerBookings.id,
        status: partnerBookings.status,
        guestName: partnerBookings.guestName,
        checkInDate: partnerBookings.checkInDate,
        totalAmount: partnerBookings.totalAmount,
        currency: partnerBookings.currency,
      })
      .from(partnerBookings)
      .where(
        and(
          eq(partnerBookings.organizationId, ctx.orgId),
          inArray(partnerBookings.status, ['confirmed', 'completed']),
        ),
      )
      .orderBy(desc(partnerBookings.checkInDate))
      .limit(500);

    const mySlugs = db
      .select({ slug: partnerListings.slug })
      .from(partnerListings)
      .where(eq(partnerListings.ownerOrgId, ctx.orgId));
    const orders = await db
      .select({
        id: checkoutOrders.id,
        invoiceNo: checkoutOrders.invoiceNo,
        listingTitle: checkoutOrders.listingTitle,
        reserveYmd: checkoutOrders.reserveYmd,
        subtotalWon: checkoutOrders.subtotalWon,
        paidAt: checkoutOrders.paidAt,
      })
      .from(checkoutOrders)
      .where(and(eq(checkoutOrders.status, 'paid'), inArray(checkoutOrders.listingSlug, mySlugs)))
      .orderBy(desc(checkoutOrders.paidAt))
      .limit(500);

    const [account] = await db
      .select({
        settlementFeeBp: billingPlans.settlementFeeBp,
        planName: billingPlans.name,
        taxInvoiceEmail: billingAccounts.taxInvoiceEmail,
        billingEmail: billingAccounts.billingEmail,
      })
      .from(billingAccounts)
      .innerJoin(billingPlans, eq(billingAccounts.planId, billingPlans.id))
      .where(eq(billingAccounts.organizationId, ctx.orgId))
      .limit(1);

    return { bookings, orders, account: account ?? null };
  });

  const completed = bookings.filter((b) => b.status === 'completed');
  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const completedKrw = completed.filter((b) => b.currency === 'KRW').reduce((s, b) => s + b.totalAmount, 0);
  const confirmedKrw = confirmed.filter((b) => b.currency === 'KRW').reduce((s, b) => s + b.totalAmount, 0);
  const otherCurrencies = [...new Set(bookings.filter((b) => b.currency !== 'KRW').map((b) => b.currency))];
  const ordersKrw = orders.reduce((s, o) => s + o.subtotalWon, 0);

  const feeBp = account?.settlementFeeBp ?? 0;
  const grossKrw = completedKrw + ordersKrw;
  const feeKrw = Math.round((grossKrw * feeBp) / 10000);

  // 월별 집계 (완료 부킹 = 체크인월, 직판 = 입금월)
  const byMonth = new Map<string, { bookingKrw: number; bookingCount: number; orderKrw: number; orderCount: number }>();
  const bucket = (m: string) => {
    const b = byMonth.get(m) ?? { bookingKrw: 0, bookingCount: 0, orderKrw: 0, orderCount: 0 };
    byMonth.set(m, b);
    return b;
  };
  for (const b of completed) {
    if (b.currency !== 'KRW') continue;
    const agg = bucket(b.checkInDate.slice(0, 7));
    agg.bookingKrw += b.totalAmount;
    agg.bookingCount += 1;
  }
  for (const o of orders) {
    const m = (o.paidAt ? o.paidAt.toISOString() : '').slice(0, 7);
    if (!m) continue;
    const agg = bucket(m);
    agg.orderKrw += o.subtotalWon;
    agg.orderCount += 1;
  }
  const months = [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">정산</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          서비스 제공이 끝난(completed) 부킹과 입금 확인된 글로우업 상품 직판이 정산
          대상입니다. 지급 주기·방식은 계약에 따르며, 문의는 담당 매니저 또는 청구
          이메일로 해 주세요.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['완료 부킹 누계', `${money(completedKrw)} · ${completed.length}건`],
          ['확정(예정) 부킹', `${money(confirmedKrw)} · ${confirmed.length}건`],
          ['상품 직판 누계', `${money(ordersKrw)} · ${orders.length}건`],
          [
            `플랜 정산 수수료 (${feeBp > 0 ? `${(feeBp / 100).toFixed(1)}%` : '없음'})`,
            feeBp > 0 ? `차감 예상 ${money(feeKrw)}` : '—',
          ],
        ].map(([label, v]) => (
          <Card key={label}>
            <CardContent className="py-4">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-lg font-bold">{v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {otherCurrencies.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          KRW 외 통화({otherCurrencies.join(', ')}) 부킹은 합계에서 제외했습니다 — 개별 건은 부킹 화면에서 확인하세요.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">월별 정산 집계</CardTitle>
          <CardDescription className="text-xs">
            완료 부킹은 체크인 월, 상품 직판은 입금 확인 월 기준입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {months.length === 0 ? (
            <div className="px-6 pb-8 pt-2">
              <EmptyState
                icon={Wallet}
                title="정산 대상 내역이 아직 없습니다"
                description="부킹이 completed 처리되거나 글로우업 상품이 판매되면 여기 집계에 잡힙니다."
              />
            </div>
          ) : (
            <div className="divide-y">
              {months.map(([m, agg]) => (
                <div key={m} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                  <div className="w-24 shrink-0 text-sm font-semibold">{m}</div>
                  <div className="flex-1 text-sm text-muted-foreground">
                    부킹 {agg.bookingCount}건 · 직판 {agg.orderCount}건
                  </div>
                  <div className="w-44 text-right text-sm">
                    부킹 {agg.bookingKrw > 0 ? money(agg.bookingKrw) : '—'}
                  </div>
                  <div className="w-44 text-right text-sm font-semibold">
                    직판 {agg.orderKrw > 0 ? money(agg.orderKrw) : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 직판 주문</CardTitle>
          <CardDescription className="text-xs">
            공개 포털에서 우리 상품이 팔려 입금 확인된 건 — 상품가 기준.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <p className="px-6 pb-6 pt-2 text-sm text-muted-foreground">아직 입금 확인된 직판 주문이 없습니다.</p>
          ) : (
            <div className="divide-y">
              {orders.slice(0, 20).map((o) => (
                <div key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{o.invoiceNo}</span>
                  <span className="flex-1 truncate">{o.listingTitle}</span>
                  <span className="text-xs text-muted-foreground">{o.reserveYmd ?? ''}</span>
                  <span className="w-32 text-right font-semibold">{money(o.subtotalWon)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">세금계산서 수신 정보</CardTitle>
          <CardDescription className="text-xs">수신 주소 변경은 청구서 화면의 청구 연락처에서 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">세금계산서 이메일</div>
            <div className="font-medium">{account?.taxInvoiceEmail ?? '미설정'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">청구 이메일</div>
            <div className="font-medium">{account?.billingEmail ?? '미설정'}</div>
          </div>
          <Badge variant="outline" className="self-center">발행은 정산 사이클에 따라 진행</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
