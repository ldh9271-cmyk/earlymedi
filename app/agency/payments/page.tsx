import Link from 'next/link';
import { and, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent } from '@/components/shared/ui/card';
import { formatLocal } from '@/lib/utils/date';

export const metadata = { title: '결제 · 인보이스' };
export const dynamic = 'force-dynamic';

/**
 * 결제 현황 — glowuptour.com 예약 팝업에서 발행된 인보이스(뷰티 투어 ·
 * 패키지 · 시술 실적)를 상태별로 본다. 토스/알리페이 결제 확인은
 * 웹훅으로 자동 반영되고, 수동 입금 확인·취소 처리는 마스터 콘솔의
 * 주문 관리에서 한다 (같은 데이터).
 */

const STATUS_META: Record<string, { label: string; variant: 'brand' | 'hospitality' | 'care' | 'destructive' | 'outline' }> = {
  issued: { label: '발행됨', variant: 'outline' },
  reported: { label: '입금 신고', variant: 'hospitality' },
  paid: { label: '결제 확인', variant: 'care' },
  cancelled: { label: '취소', variant: 'destructive' },
};

const STATUSES = ['issued', 'reported', 'paid', 'cancelled'] as const;

const METHOD_LABEL: Record<string, string> = {
  alipay: 'Alipay',
  toss: '토스페이먼츠',
  card: '카드',
};

function won(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`;
}

export default async function AgencyPaymentsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });
  const statusFilter = STATUSES.includes(searchParams.status as (typeof STATUSES)[number])
    ? (searchParams.status as (typeof STATUSES)[number])
    : null;
  const q = (searchParams.q ?? '').trim().slice(0, 100);

  const { rows, all } = await withRls(ctx, async () => {
    const where: SQL[] = [];
    if (statusFilter) where.push(eq(checkoutOrders.status, statusFilter));
    if (q) {
      const term = `%${q}%`;
      const orC = or(
        ilike(checkoutOrders.invoiceNo, term),
        ilike(checkoutOrders.listingTitle, term),
        ilike(checkoutOrders.guestName, term),
        ilike(checkoutOrders.guestContact, term),
      );
      if (orC) where.push(orC);
    }
    const rows = await db
      .select()
      .from(checkoutOrders)
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(checkoutOrders.createdAt))
      .limit(100);

    const all = await db
      .select({
        status: checkoutOrders.status,
        totalWon: checkoutOrders.totalWon,
        paidAt: checkoutOrders.paidAt,
      })
      .from(checkoutOrders);

    return { rows, all };
  });

  const thisMonth = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
  const stats = {
    paidMonthWon: all
      .filter((o) => o.status === 'paid' && o.paidAt && new Date(o.paidAt).toISOString().slice(0, 7) === thisMonth)
      .reduce((s, o) => s + o.totalWon, 0),
    paidTotalWon: all.filter((o) => o.status === 'paid').reduce((s, o) => s + o.totalWon, 0),
    reported: all.filter((o) => o.status === 'reported').length,
    issued: all.filter((o) => o.status === 'issued').length,
  };
  const counts: Record<string, number> = {};
  for (const o of all) counts[o.status] = (counts[o.status] ?? 0) + 1;

  const filterHref = (s: string | null): string => {
    const p = new URLSearchParams();
    if (s) p.set('status', s);
    if (q) p.set('q', q);
    const qs = p.toString();
    return `/agency/payments${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="brand" className="mb-2">💳 결제</Badge>
        <h1 className="text-2xl font-bold tracking-tight">결제 · 인보이스</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          사이트 예약에서 발행된 인보이스입니다. 토스 결제는 자동으로 [결제 확인]되며,
          알리페이 입금 확인과 취소 처리는{' '}
          <a href="/master/orders" className="font-medium underline">마스터 → 주문 관리</a>
          에서 합니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={`이번 달 결제 확인 (${thisMonth})`} value={won(stats.paidMonthWon)} />
        <StatCard label="누적 결제 확인" value={won(stats.paidTotalWon)} />
        <StatCard label="입금 신고 — 확인 필요" value={`${stats.reported}건`} highlight={stats.reported > 0} />
        <StatCard label="발행됨 (미결제)" value={`${stats.issued}건`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={filterHref(null)}
          className={`rounded-full border px-3 py-1 text-xs ${!statusFilter ? 'border-brand-500 bg-brand-500 text-white' : 'hover:bg-muted/50'}`}
        >
          전체 {all.length}
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={filterHref(s)}
            className={`rounded-full border px-3 py-1 text-xs ${statusFilter === s ? 'border-brand-500 bg-brand-500 text-white' : 'hover:bg-muted/50'}`}
          >
            {STATUS_META[s]!.label} {counts[s] ?? 0}
          </Link>
        ))}
        <form action="/agency/payments" className="ml-auto flex items-center gap-1.5">
          {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
          <input
            name="q"
            defaultValue={q}
            placeholder="인보이스 · 상품 · 고객 검색"
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs"
          />
          <button type="submit" className="h-8 rounded-md border px-2.5 text-xs hover:bg-muted/50">
            검색
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            조건에 맞는 인보이스가 없습니다.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[860px] text-xs">
              <thead>
                <tr className="border-b bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">인보이스</th>
                  <th className="px-2 py-2.5 text-left font-medium">상품</th>
                  <th className="px-2 py-2.5 text-left font-medium">고객</th>
                  <th className="px-2 py-2.5 text-left font-medium">이용일</th>
                  <th className="px-2 py-2.5 text-right font-medium">금액</th>
                  <th className="px-2 py-2.5 text-left font-medium">수단</th>
                  <th className="px-2 py-2.5 text-left font-medium">상태</th>
                  <th className="px-4 py-2.5 text-left font-medium">발행 / 확인</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const meta = STATUS_META[o.status] ?? STATUS_META.issued!;
                  return (
                    <tr key={o.id} className="border-b border-border/40 hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-mono text-[11px]">{o.invoiceNo}</td>
                      <td className="max-w-[220px] truncate px-2 py-2.5" title={o.listingTitle}>
                        {o.listingTitle}
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          {o.guests}명 · {o.locale.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-2 py-2.5">
                        {o.guestName || o.patientLabel || o.userEmail || (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {o.guestCountryCode ? (
                          <span className="ml-1 text-[10px] text-muted-foreground">{o.guestCountryCode}</span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">{o.reserveYmd ?? o.reserveDate}</td>
                      <td className="px-2 py-2.5 text-right font-semibold">{won(o.totalWon)}</td>
                      <td className="px-2 py-2.5">{METHOD_LABEL[o.paymentMethod] ?? o.paymentMethod}</td>
                      <td className="px-2 py-2.5">
                        <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-[10px] text-muted-foreground">
                        {formatLocal(new Date(o.createdAt), 'Asia/Seoul', 'MM-dd HH:mm')}
                        {o.paidAt ? (
                          <span className="text-care-700">
                            {' '}✓ {formatLocal(new Date(o.paidAt), 'Asia/Seoul', 'MM-dd HH:mm')}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}): JSX.Element {
  return (
    <Card className={highlight ? 'border-amber-300 bg-amber-50/50' : ''}>
      <CardContent className="p-4">
        <div className="text-lg font-bold leading-tight">{value}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
