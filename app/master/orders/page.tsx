import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq, sql } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { markOrderPaidAction, cancelOrderAction } from './_actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: '예약 인보이스 — 마스터 관리자' };

/**
 * 공개 포털 예약 팝업에서 발행된 인보이스 목록.
 *
 * 게스트가 '결제하기'를 누르면 issued 로 생기고, '결제를 완료했어요'를
 * 누르면 reported 로 올라온다. reported 는 자기신고일 뿐이므로 운영자가
 * 알리페이 정산과 대조한 뒤 '입금 확인'을 눌러 paid 로 확정한다.
 */

const STATUS_LABEL: Record<string, { text: string; bg: string; fg: string }> = {
  issued: { text: '발행됨 · 입금 대기', bg: '#fff7ed', fg: '#b45309' },
  reported: { text: '입금 신고 · 확인 필요', bg: '#eff6ff', fg: '#1d4ed8' },
  paid: { text: '입금 확인', bg: '#ecfdf5', fg: '#047857' },
  cancelled: { text: '취소', bg: '#f5f5f5', fg: '#6a6a6a' },
};

export default async function MasterOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; error?: string };
}): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  if (!isMasterEmail(auth.user.email ?? '')) redirect('/select-org');

  const filter = searchParams.status ?? '';

  let rows: Array<typeof checkoutOrders.$inferSelect> = [];
  let dbError: string | null = null;
  try {
    const base = db.select().from(checkoutOrders);
    rows = await (
      filter === 'issued' || filter === 'reported' || filter === 'paid' || filter === 'cancelled'
        ? base.where(eq(checkoutOrders.status, filter))
        : base
    )
      .orderBy(desc(checkoutOrders.createdAt))
      .limit(200);
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'db_error';
  }

  let totals = { count: 0, paidWon: 0, pendingWon: 0 };
  try {
    const [agg] = await db
      .select({
        count: sql<number>`count(*)::int`,
        paidWon: sql<number>`coalesce(sum(case when ${checkoutOrders.status} = 'paid' then ${checkoutOrders.totalWon} else 0 end), 0)::int`,
        pendingWon: sql<number>`coalesce(sum(case when ${checkoutOrders.status} in ('issued','reported') then ${checkoutOrders.totalWon} else 0 end), 0)::int`,
      })
      .from(checkoutOrders);
    if (agg) totals = agg;
  } catch {
    /* 집계 실패는 목록 표시를 막지 않는다 */
  }

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 1240, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>예약 인보이스</h1>
          <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 0' }}>
            공개 포털 예약 팝업에서 발행된 결제 건. 입금 신고는 게스트의 자기신고이므로 알리페이 정산과 대조 후 확정하세요.
          </p>
        </div>
        <Link href="/master" style={{ fontSize: 13, color: '#222', textDecoration: 'underline' }}>
          마스터 홈
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
        <StatCard label="전체 건수" value={`${totals.count.toLocaleString('ko-KR')}건`} />
        <StatCard label="입금 확인 합계" value={`₩${totals.paidWon.toLocaleString('ko-KR')}`} accent="#047857" />
        <StatCard label="대기 중 합계" value={`₩${totals.pendingWon.toLocaleString('ko-KR')}`} accent="#b45309" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
        {[
          { key: '', label: '전체' },
          { key: 'reported', label: '입금 신고' },
          { key: 'issued', label: '입금 대기' },
          { key: 'paid', label: '입금 확인' },
          { key: 'cancelled', label: '취소' },
        ].map((c) => (
          <Link
            key={c.key || 'all'}
            href={c.key ? `/master/orders?status=${c.key}` : '/master/orders'}
            style={{
              border: '1px solid #dddddd', borderRadius: 9999,
              padding: '6px 14px', fontSize: 13, textDecoration: 'none',
              background: filter === c.key ? '#222' : '#fff',
              color: filter === c.key ? '#fff' : '#222',
            }}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {searchParams.error ? (
        <p style={{ color: '#dc2626', fontSize: 13, marginTop: 16 }}>처리에 실패했습니다: {searchParams.error}</p>
      ) : null}
      {dbError ? (
        <p style={{ color: '#dc2626', fontSize: 13, marginTop: 16 }}>목록을 불러오지 못했습니다: {dbError}</p>
      ) : null}

      <div style={{ marginTop: 18, border: '1px solid #ebebeb', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 980 }}>
            <thead>
              <tr style={{ background: '#fafafa', textAlign: 'left' }}>
                <Th>인보이스</Th>
                <Th>상태</Th>
                <Th>상품</Th>
                <Th>일정</Th>
                <Th>인원</Th>
                <Th align="right">금액</Th>
                <Th>발행 시각</Th>
                <Th>처리</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 28, textAlign: 'center', color: '#6a6a6a' }}>
                    아직 발행된 인보이스가 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const s = STATUS_LABEL[r.status] ?? { text: r.status, bg: '#f5f5f5', fg: '#6a6a6a' };
                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid #ebebeb' }}>
                      <Td>
                        <span style={{ fontWeight: 700 }}>{r.invoiceNo}</span>
                        <div style={{ fontSize: 11, color: '#9c9c9c', marginTop: 2 }}>
                          {r.paymentMethod} · {r.locale}
                        </div>
                      </Td>
                      <Td>
                        <span
                          style={{
                            background: s.bg, color: s.fg,
                            borderRadius: 9999, padding: '3px 10px',
                            fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                          }}
                        >
                          {s.text}
                        </span>
                      </Td>
                      <Td>
                        <div style={{ fontWeight: 600 }}>{r.listingTitle}</div>
                        {r.listingSlug ? (
                          <div style={{ fontSize: 11, color: '#9c9c9c', marginTop: 2 }}>{r.listingSlug}</div>
                        ) : null}
                      </Td>
                      <Td>
                        <div>{r.reserveDate}</div>
                        <div style={{ fontSize: 11, color: '#9c9c9c', marginTop: 2 }}>{r.reserveTime}</div>
                      </Td>
                      <Td>{r.guests}명</Td>
                      <Td align="right">
                        <div style={{ fontWeight: 700 }}>₩{r.totalWon.toLocaleString('ko-KR')}</div>
                        <div style={{ fontSize: 11, color: '#9c9c9c', marginTop: 2 }}>
                          ₩{r.subtotalWon.toLocaleString('ko-KR')} + 수수료 ₩{r.serviceFeeWon.toLocaleString('ko-KR')}
                        </div>
                      </Td>
                      <Td>
                        {new Date(r.createdAt).toLocaleString('ko-KR', {
                          month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                        {r.reportedAt ? (
                          <div style={{ fontSize: 11, color: '#1d4ed8', marginTop: 2 }}>
                            신고 {new Date(r.reportedAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        ) : null}
                      </Td>
                      <Td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {r.status !== 'paid' ? (
                            <form action={markOrderPaidAction}>
                              <input type="hidden" name="id" value={r.id} />
                              <button type="submit" style={btnStyle('#047857')}>입금 확인</button>
                            </form>
                          ) : null}
                          {r.status !== 'cancelled' && r.status !== 'paid' ? (
                            <form action={cancelOrderAction}>
                              <input type="hidden" name="id" value={r.id} />
                              <button type="submit" style={btnStyle('#6a6a6a')}>취소</button>
                            </form>
                          ) : null}
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return {
    border: `1px solid ${color}`, color, background: '#fff',
    borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  };
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }): JSX.Element {
  return (
    <th style={{ padding: '10px 12px', fontWeight: 700, fontSize: 12, color: '#6a6a6a', textAlign: align ?? 'left' }}>
      {children}
    </th>
  );
}

function Td({ children, align }: { children: React.ReactNode; align?: 'right' }): JSX.Element {
  return <td style={{ padding: '12px', verticalAlign: 'top', textAlign: align ?? 'left' }}>{children}</td>;
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }): JSX.Element {
  return (
    <div style={{ border: '1px solid #ebebeb', borderRadius: 12, padding: '14px 18px', minWidth: 180 }}>
      <div style={{ fontSize: 12, color: '#6a6a6a' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: accent ?? '#222' }}>{value}</div>
    </div>
  );
}
