import Link from 'next/link';
import ListSearch from '@/components/shared/list-search';
import { redirect } from 'next/navigation';
import { desc, eq, sql } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { resolveRefundCategories } from '@/lib/refund/service';
import type { RefundCategory } from '@/lib/refund/policy';
import { issueQuoteInvoiceAction } from './_actions';
import { OrderActions } from './_components/order-actions';
import { customerOf, kindLabel, statusOf } from './_lib/order-view';

export const dynamic = 'force-dynamic';
export const metadata = { title: '예약 인보이스 — 마스터 관리자' };

/**
 * 공개 포털 예약 팝업에서 발행된 인보이스 목록.
 *
 * 게스트가 '결제하기'를 누르면 issued 로 생기고, '결제를 완료했어요'를
 * 누르면 reported 로 올라온다. reported 는 자기신고일 뿐이므로 운영자가
 * 알리페이 정산과 대조한 뒤 '입금 확인'을 눌러 paid 로 확정한다.
 */

export default async function MasterOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; error?: string; ok?: string };
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

  // 취소·환불 박스용 — 상품 종류별 환불 규정 카테고리 (쿼리 2번)
  const refundCats = await resolveRefundCategories(rows).catch(() => new Map<string, RefundCategory>());

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
            결제 주문 · 견적 · 호텔/예약 요청 · 병원 진료 예약이 모두 한 줄씩 올라옵니다. 인보이스 번호(또는 ‘상세 보기’)를 누르면 고객 연락처 · 요청 내용 · 결제 · 진행 이력 전체가 보입니다. 입금 신고는 게스트의 자기신고이므로 알리페이 정산과 대조 후 확정하세요.
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

      {searchParams.ok ? (
        <p style={{ color: '#047857', fontSize: 13, marginTop: 16, fontWeight: 700 }}>✅ {searchParams.ok}</p>
      ) : null}
      {searchParams.error ? (
        <p style={{ color: '#dc2626', fontSize: 13, marginTop: 16 }}>처리에 실패했습니다: {searchParams.error}</p>
      ) : null}

      {/* 견적 인보이스 발행 — 호텔처럼 가격을 미리 안 보여주는 상품. 문의 답변 뒤 금액이 정해지면 회원 앞으로 토스 인보이스를 보낸다 */}
      <details style={{ marginTop: 18, border: '1px solid #fecdd3', background: '#fff5f7', borderRadius: 12, padding: '12px 16px' }}>
        <summary style={{ fontSize: 14, fontWeight: 800, color: '#c81e42', cursor: 'pointer' }}>💌 견적 인보이스 발행 (호텔·가격 미표시 상품) — 회원 이메일로 토스 결제 링크 발송</summary>
        <form action={issueQuoteInvoiceAction} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginTop: 12, fontSize: 13 }}>
          <label style={{ display: 'grid', gap: 4 }}>회원 이메일 *<input name="email" type="email" required placeholder="customer@example.com" style={{ padding: 8, border: '1px solid #ddd', borderRadius: 8 }} /></label>
          <label style={{ display: 'grid', gap: 4 }}>메일 언어
            <select name="locale" defaultValue="kr" style={{ padding: 8, border: '1px solid #ddd', borderRadius: 8 }}>
              <option value="kr">한국어</option><option value="en">English</option><option value="ja">日本語</option><option value="zh">中文</option><option value="ru">Русский</option><option value="vi">Tiếng Việt</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, gridColumn: 'span 2' }}>상품명 * (호텔명 · 객실 · 기간)<input name="title" required maxLength={300} placeholder="예: 호텔 라플라스 디럭스 더블 2박" style={{ padding: 8, border: '1px solid #ddd', borderRadius: 8 }} /></label>
          <label style={{ display: 'grid', gap: 4 }}>결제 금액(원) *<input name="amountWon" required inputMode="numeric" placeholder="350000" style={{ padding: 8, border: '1px solid #ddd', borderRadius: 8 }} /></label>
          <label style={{ display: 'grid', gap: 4 }}>체크인·이용일<input name="dateYmd" type="date" style={{ padding: 8, border: '1px solid #ddd', borderRadius: 8 }} /></label>
          <label style={{ display: 'grid', gap: 4 }}>기간 표시 (예: 2박)<input name="periodLabel" maxLength={60} placeholder="2박 3일" style={{ padding: 8, border: '1px solid #ddd', borderRadius: 8 }} /></label>
          <label style={{ display: 'grid', gap: 4 }}>인원<input name="guests" type="number" min={1} max={20} defaultValue={2} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 8 }} /></label>
          <label style={{ display: 'grid', gap: 4 }}>분류
            <select name="interestKey" defaultValue="hotel" style={{ padding: 8, border: '1px solid #ddd', borderRadius: 8 }}>
              <option value="hotel">호텔·숙박</option><option value="travel">여행·투어</option><option value="beauty">뷰티</option><option value="other">기타</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4 }}>리스팅 slug (선택)<input name="listingSlug" maxLength={200} placeholder="/listings/<slug> 의 slug" style={{ padding: 8, border: '1px solid #ddd', borderRadius: 8 }} /></label>
          <label style={{ display: 'grid', gap: 4, gridColumn: '1 / -1' }}>고객에게 보이는 메모 (포함 사항 · 조건 · 취소 규정)<textarea name="note" rows={3} maxLength={1000} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit' }} /></label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="submit" style={{ background: '#ff385c', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 18px', fontWeight: 800, cursor: 'pointer' }}>인보이스 발행 + 이메일 보내기</button>
            <span style={{ fontSize: 12, color: '#6a6a6a' }}>회원(가입 계정)에게만 발행됩니다. 발행 후 아래 목록에 kind=quote · 입금 대기로 보이고, 회원이 마이페이지에서 토스로 결제하면 결제 완료로 바뀝니다.</span>
          </div>
        </form>
      </details>
      {dbError ? (
        <p style={{ color: '#dc2626', fontSize: 13, marginTop: 16 }}>목록을 불러오지 못했습니다: {dbError}</p>
      ) : null}

      <ListSearch placeholder="인보이스 번호 · 고객 이름 · 이메일 · 연락처 · 상품으로 찾기" hint="띄어쓰기로 여러 단어를 넣으면 모두 포함된 항목만 남습니다. 인보이스 번호나 '상세 보기'를 누르면 그 예약의 전체 정보가 열립니다." />

      <div style={{ marginTop: 18, border: '1px solid #ebebeb', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1120 }}>
            <thead>
              <tr style={{ background: '#fafafa', textAlign: 'left' }}>
                <Th>인보이스</Th>
                <Th>상태</Th>
                <Th>고객</Th>
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
                  <td colSpan={9} style={{ padding: '40px 16px', textAlign: 'center', color: '#6a6a6a' }}>
                    아직 발행된 인보이스가 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const s = statusOf(r);
                  const c = customerOf(r);
                  const detail = `/master/orders/${r.id}`;
                  // 보이는 글자 외에 검색에 걸릴 키워드 (slug · 연락처 원문 · 병원명)
                  const searchText = [c.name, c.email, c.phone, c.messenger, c.country, c.rawContact, r.hospitalName, r.listingSlug, r.kind].filter(Boolean).join(' ');
                  return (
                    <tr key={r.id} data-search-text={searchText} style={{ borderTop: '1px solid #ebebeb' }}>
                      <Td>
                        <Link href={detail} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, fontWeight: 700, color: '#222' }}>
                          {r.invoiceNo}
                        </Link>
                        <div style={{ fontSize: 11, color: '#6a6a6a', marginTop: 3, whiteSpace: 'nowrap' }}>{kindLabel(r)}</div>
                        <div style={{ fontSize: 11, color: '#9c9c9c', marginTop: 2 }}>
                          {r.paymentMethod} · {r.locale}
                        </div>
                        <Link href={detail} style={{ display: 'inline-block', marginTop: 8, fontSize: 12, fontWeight: 700, color: '#ff385c', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          상세 보기 →
                        </Link>
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
                        <div style={{ fontWeight: 700 }}>
                          {c.name ?? <span style={{ color: '#9c9c9c', fontWeight: 500 }}>이름 없음</span>}
                          {c.country ? <span style={{ fontWeight: 500, color: '#6a6a6a' }}> ({c.country})</span> : null}
                        </div>
                        {c.email ? (
                          <div style={{ fontSize: 12, color: c.member ? '#047857' : '#6a6a6a', wordBreak: 'break-all', marginTop: 2 }}>
                            {c.member ? '회원 · ' : ''}{c.email}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>비회원</div>
                        )}
                        {c.phone ? <div style={{ fontSize: 12, marginTop: 2 }}>📞 {c.phone}</div> : null}
                        {c.messenger ? <div style={{ fontSize: 12, marginTop: 2 }}>💬 {c.messenger}</div> : null}
                        {!c.phone && !c.messenger && c.rawContact ? <div style={{ fontSize: 12, marginTop: 2 }}>{c.rawContact}</div> : null}
                      </Td>
                      <Td>
                        <div style={{ fontWeight: 600 }}>{r.listingTitle}</div>
                        {r.hospitalName && r.hospitalName !== r.listingTitle ? (<div style={{ fontSize: 12, color: '#1d4ed8', marginTop: 2 }}>🏥 {r.hospitalName}</div>) : null}
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
                        {r.kind === 'stay_request' ? <div style={{ fontWeight: 700, color: '#c81e42', whiteSpace: 'nowrap' }}>🏨 호텔 문의 · 견적 대기</div> : r.kind === 'booking_request' ? <div style={{ fontWeight: 700, color: '#c81e42', whiteSpace: 'nowrap' }}>{(r.meta as { subType?: string } | null)?.subType === 'free' ? '🧳 자유여행 견적 대기' : '📩 예약 요청 · 확인 대기'}{r.subtotalWon > 0 ? <div style={{ fontSize: 11, color: '#6a6a6a', fontWeight: 500 }}>표시가 ₩{r.subtotalWon.toLocaleString('ko-KR')}</div> : null}</div> : r.kind === 'hospital_visit' ? <div style={{ fontWeight: 700, color: '#1d4ed8', whiteSpace: 'nowrap' }}>🏥 진료 예약 · 무료</div> : <div style={{ fontWeight: 700 }}>{r.kind === 'quote' ? '견적 ' : ''}₩{r.totalWon.toLocaleString('ko-KR')}</div>}
                        {r.kind === 'stay_request' || r.kind === 'booking_request' || r.kind === 'quote' || r.kind === 'hospital_visit' ? null : (
                        <div style={{ fontSize: 11, color: '#9c9c9c', marginTop: 2 }}>
                          {r.serviceFeeWon > 0
                            ? `₩${r.subtotalWon.toLocaleString('ko-KR')} + 수수료 ₩${r.serviceFeeWon.toLocaleString('ko-KR')}`
                            : `현장결제 예정 ₩${r.subtotalWon.toLocaleString('ko-KR')}`}
                        </div>
                        )}
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
                        <OrderActions order={r} category={refundCats.get(r.id) ?? 'travel'} />
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
