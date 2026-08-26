import Link from 'next/link';
import { and, eq, gte, inArray, isNotNull, lte, or } from 'drizzle-orm';
import { requireAccess } from '@/lib/auth/route-guards';
import { withRls } from '@/lib/auth/rls-context';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { cases } from '@/drizzle/schema/cases';
import { caseQuotes } from '@/drizzle/schema/case-quotes';
import { hospitals } from '@/drizzle/schema/hospitals';
import { partnerBookings } from '@/drizzle/schema/partner-bookings';
import { Badge } from '@/components/shared/ui/badge';
import { Card, CardContent } from '@/components/shared/ui/card';

export const metadata = { title: '마스터 캘린더' };
export const dynamic = 'force-dynamic';

/**
 * 마스터 캘린더 — 날짜가 있는 모든 운영 이벤트를 한 달력에 모은다:
 *
 *   · 패키지/상품 예약일 (checkout_orders.reserve_ymd — 뷰티 투어 포함)
 *   · 케이스 입국·출국 예정 (cases)
 *   · 견적 유효기간 만료 (case_quotes.valid_until)
 *   · 파트너 예약 체크인 (partner_bookings)
 *
 * 읽기 전용 통합 뷰 — 항목 클릭 시 원본 화면으로 이동한다.
 */

type CalEvent = {
  date: string; // YYYY-MM-DD
  kind: 'order' | 'arrival' | 'departure' | 'quote_expiry' | 'partner';
  label: string;
  href: string;
};

const KIND_META: Record<CalEvent['kind'], { chip: string; dot: string; legend: string }> = {
  order: { chip: 'bg-brand-50 text-brand-700 border-brand-200', dot: 'bg-brand-500', legend: '상품 예약' },
  arrival: { chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', legend: '입국' },
  departure: { chip: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500', legend: '출국' },
  quote_expiry: { chip: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', legend: '견적 만료' },
  partner: { chip: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500', legend: '파트너 예약' },
};

function ymdToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); // KST
}

export default async function AgencyCalendarPage({
  searchParams,
}: {
  searchParams: { m?: string };
}): Promise<JSX.Element> {
  const ctx = await requireAccess({ allowedAccountTypes: ['agency'] });

  const today = ymdToday();
  const month = /^\d{4}-\d{2}$/.test(searchParams.m ?? '') ? searchParams.m! : today.slice(0, 7);
  const [yearStr, monStr] = month.split('-');
  const year = Number(yearStr);
  const mon = Number(monStr); // 1-12
  const monthStart = `${month}-01`;
  const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, '0')}`;
  const prev = mon === 1 ? `${year - 1}-12` : `${year}-${String(mon - 1).padStart(2, '0')}`;
  const next = mon === 12 ? `${year + 1}-01` : `${year}-${String(mon + 1).padStart(2, '0')}`;

  const events = await withRls(ctx, async () => {
    const out: CalEvent[] = [];

    const orders = await db
      .select({
        id: checkoutOrders.id,
        invoiceNo: checkoutOrders.invoiceNo,
        title: checkoutOrders.listingTitle,
        guests: checkoutOrders.guests,
        status: checkoutOrders.status,
        ymd: checkoutOrders.reserveYmd,
      })
      .from(checkoutOrders)
      .where(
        and(
          isNotNull(checkoutOrders.reserveYmd),
          gte(checkoutOrders.reserveYmd, monthStart),
          lte(checkoutOrders.reserveYmd, monthEnd),
          inArray(checkoutOrders.status, ['issued', 'reported', 'paid']),
        ),
      );
    for (const o of orders) {
      out.push({
        date: o.ymd!,
        kind: 'order',
        label: `${o.title} · ${o.guests}명${o.status === 'paid' ? '' : ' (미결제)'}`,
        href: `/agency/payments?q=${o.invoiceNo}`,
      });
    }

    const caseRows = await db
      .select({
        id: cases.id,
        title: cases.title,
        arrival: cases.estimatedArrivalDate,
        departure: cases.estimatedDepartureDate,
      })
      .from(cases)
      .where(
        and(
          eq(cases.organizationId, ctx.orgId),
          or(
            and(gte(cases.estimatedArrivalDate, monthStart), lte(cases.estimatedArrivalDate, monthEnd)),
            and(gte(cases.estimatedDepartureDate, monthStart), lte(cases.estimatedDepartureDate, monthEnd)),
          ),
        ),
      );
    for (const c of caseRows) {
      if (c.arrival && c.arrival >= monthStart && c.arrival <= monthEnd) {
        out.push({ date: c.arrival, kind: 'arrival', label: c.title, href: `/agency/cases/${c.id}` });
      }
      if (c.departure && c.departure >= monthStart && c.departure <= monthEnd) {
        out.push({ date: c.departure, kind: 'departure', label: c.title, href: `/agency/cases/${c.id}` });
      }
    }

    const quotes = await db
      .select({
        caseId: caseQuotes.caseId,
        hospitalName: hospitals.name,
        validUntil: caseQuotes.validUntil,
      })
      .from(caseQuotes)
      .innerJoin(hospitals, eq(caseQuotes.hospitalId, hospitals.id))
      .where(
        and(
          eq(caseQuotes.organizationId, ctx.orgId),
          eq(caseQuotes.status, 'received'),
          isNotNull(caseQuotes.validUntil),
          gte(caseQuotes.validUntil, monthStart),
          lte(caseQuotes.validUntil, monthEnd),
        ),
      );
    for (const q of quotes) {
      out.push({
        date: String(q.validUntil).slice(0, 10),
        kind: 'quote_expiry',
        label: `${q.hospitalName} 견적 만료`,
        href: '/agency/quotes',
      });
    }

    const bookings = await db
      .select({
        id: partnerBookings.id,
        guestName: partnerBookings.guestName,
        checkIn: partnerBookings.checkInDate,
      })
      .from(partnerBookings)
      .where(
        and(
          gte(partnerBookings.checkInDate, monthStart),
          lte(partnerBookings.checkInDate, monthEnd),
          inArray(partnerBookings.status, ['pending', 'confirmed']),
        ),
      );
    for (const b of bookings) {
      out.push({
        date: String(b.checkIn).slice(0, 10),
        kind: 'partner',
        label: `파트너 예약 · ${b.guestName}`,
        href: '/agency/partners',
      });
    }

    return out.sort((a, b) => a.date.localeCompare(b.date));
  });

  const byDay = new Map<string, CalEvent[]>();
  for (const e of events) {
    const list = byDay.get(e.date) ?? [];
    list.push(e);
    byDay.set(e.date, list);
  }

  // 일요일 시작 그리드
  const firstWeekday = new Date(Date.UTC(year, mon - 1, 1)).getUTCDay(); // 0=일
  const cells: Array<string | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="brand" className="mb-2">📅 캘린더</Badge>
          <h1 className="text-2xl font-bold tracking-tight">마스터 캘린더</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            상품 예약 · 케이스 입출국 · 견적 만료 · 파트너 예약을 한 달력에서 봅니다.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/agency/calendar?m=${prev}`} className="rounded-md border px-2.5 py-1 hover:bg-muted/50">←</Link>
          <span className="min-w-[90px] text-center font-semibold">{year}년 {mon}월</span>
          <Link href={`/agency/calendar?m=${next}`} className="rounded-md border px-2.5 py-1 hover:bg-muted/50">→</Link>
          <Link href="/agency/calendar" className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted/50">오늘</Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {Object.entries(KIND_META).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${v.dot}`} />
            {v.legend}
          </span>
        ))}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-3">
          <div className="grid min-w-[840px] grid-cols-7 gap-1">
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <div
                key={d}
                className={`px-2 py-1 text-center text-[11px] font-semibold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-sky-600' : 'text-muted-foreground'}`}
              >
                {d}
              </div>
            ))}
            {cells.map((day, i) => (
              <div
                key={i}
                className={`min-h-[92px] rounded-md border p-1.5 ${day ? (day === today ? 'border-brand-400 bg-brand-50/40' : 'bg-background') : 'border-transparent bg-muted/20'}`}
              >
                {day ? (
                  <>
                    <div className={`text-[11px] font-semibold ${day === today ? 'text-brand-600' : ''}`}>
                      {Number(day.slice(8))}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {(byDay.get(day) ?? []).slice(0, 3).map((e, j) => (
                        <Link
                          key={j}
                          href={e.href}
                          title={e.label}
                          className={`block truncate rounded border px-1 py-0.5 text-[9.5px] leading-tight hover:opacity-80 ${KIND_META[e.kind].chip}`}
                        >
                          {e.label}
                        </Link>
                      ))}
                      {(byDay.get(day)?.length ?? 0) > 3 ? (
                        <div className="px-1 text-[9px] text-muted-foreground">
                          +{byDay.get(day)!.length - 3}건 더
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 이 달 일정 리스트 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-2 text-sm font-bold">이 달 일정 {events.length}건</h2>
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground">이 달에는 등록된 일정이 없습니다.</p>
          ) : (
            <ul className="space-y-1">
              {events.map((e, i) => (
                <li key={i}>
                  <Link href={e.href} className="flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-muted/30">
                    <span className="font-mono text-[10px] text-muted-foreground">{e.date.slice(5)}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${KIND_META[e.kind].dot}`} />
                    <span className="truncate">{e.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
