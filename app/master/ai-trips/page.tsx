import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq, inArray } from 'drizzle-orm';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import { isMasterEmail } from '@/lib/auth/master';
import { db } from '@/lib/db/client';
import { aiTripPlans } from '@/drizzle/schema/ai-trip-plans';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { mdToHtml } from '@/lib/ai/md-lite';
import { TRIP_TYPE_KO } from '@/lib/ai/trip-workflow';
import { cancelPlanAction, issueQuoteAction } from './_actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'AI 여행 일정 · 검증·견적 — 마스터 관리자' };

/**
 * AI 여행 일정 검증·견적.
 *  고객이 '플랫폼 도움'을 요청한 일정(help_requested)을 검증하고, 최종 일정·메모·견적 금액을 넣어
 *  인보이스를 발행한다. 결제 확인은 /master/orders(입금 확인) 또는 토스 자동 확인이 처리하며,
 *  paid 가 되면 일정은 자동으로 '스케줄 완성'이 된다.
 */
const STATUS: Record<string, { text: string; bg: string; fg: string }> = {
  draft: { text: '초안', bg: '#f5f5f5', fg: '#6a6a6a' },
  confirmed: { text: '고객 확정', bg: '#eff6ff', fg: '#1d4ed8' },
  help_declined: { text: '직접 진행', bg: '#f5f5f5', fg: '#6a6a6a' },
  help_requested: { text: '검증·견적 요청', bg: '#fff7ed', fg: '#b45309' },
  quoted: { text: '견적 발행 · 결제 대기', bg: '#fdf2f8', fg: '#be185d' },
  paid: { text: '스케줄 완성', bg: '#ecfdf5', fg: '#047857' },
  cancelled: { text: '취소', bg: '#f5f5f5', fg: '#6a6a6a' },
};
const FILTERS = [
  { key: '', label: '처리 필요' }, { key: 'help_requested', label: '검증·견적 요청' }, { key: 'quoted', label: '결제 대기' },
  { key: 'paid', label: '스케줄 완성' }, { key: 'confirmed', label: '고객 확정' }, { key: 'all', label: '전체' },
];

export default async function MasterAiTripsPage({ searchParams }: { searchParams: { status?: string; plan?: string; error?: string; ok?: string } }): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  if (!isMasterEmail(auth.user.email ?? '')) redirect('/select-org');

  const filter = searchParams.status ?? '';
  let rows: Array<typeof aiTripPlans.$inferSelect> = [];
  let dbError: string | null = null;
  try {
    const base = db.select().from(aiTripPlans);
    const q = filter === 'all' ? base
      : filter ? base.where(eq(aiTripPlans.status, filter))
      : base.where(inArray(aiTripPlans.status, ['help_requested', 'quoted']));
    rows = await q.orderBy(desc(aiTripPlans.updatedAt)).limit(200);
    if (searchParams.plan && !rows.some((r) => r.id === searchParams.plan)) {
      const [one] = await db.select().from(aiTripPlans).where(eq(aiTripPlans.id, searchParams.plan)).limit(1);
      if (one) rows = [one, ...rows];
    }
  } catch (err) { dbError = err instanceof Error ? err.message : 'db_error'; }

  const orderIds = rows.map((r) => r.orderId).filter((x): x is string => Boolean(x));
  const orders = new Map<string, { invoiceNo: string; status: string; totalWon: number }>();
  if (orderIds.length) {
    try {
      const os = await db.select({ id: checkoutOrders.id, invoiceNo: checkoutOrders.invoiceNo, status: checkoutOrders.status, totalWon: checkoutOrders.totalWon })
        .from(checkoutOrders).where(inArray(checkoutOrders.id, orderIds));
      for (const o of os) orders.set(o.id, o);
    } catch { /* ignore */ }
  }

  return (
    <div style={{ padding: '28px 32px 80px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>AI 여행 일정 · 검증·견적</h1>
          <p style={{ fontSize: 13, color: '#6a6a6a', margin: '6px 0 0' }}>
            고객이 확정하고 도움을 요청한 일정입니다. 병원·업체·동선을 검증해 최종 일정과 견적 금액을 넣으면 인보이스가 발행되고 고객에게 결제 링크가 이메일로 갑니다. 입금 확인은 <Link href="/master/orders" style={{ textDecoration: 'underline' }}>예약 인보이스</Link>에서.
          </p>
        </div>
        <Link href="/master" style={{ fontSize: 13, color: '#222', textDecoration: 'underline', whiteSpace: 'nowrap' }}>마스터 홈</Link>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
        {FILTERS.map((c) => (
          <Link key={c.key || 'todo'} href={c.key ? `/master/ai-trips?status=${c.key}` : '/master/ai-trips'}
            style={{ border: '1px solid #dddddd', borderRadius: 9999, padding: '6px 14px', fontSize: 13, textDecoration: 'none', background: filter === c.key ? '#222' : '#fff', color: filter === c.key ? '#fff' : '#222' }}>
            {c.label}
          </Link>
        ))}
      </div>

      {searchParams.ok ? <p style={{ color: '#047857', fontSize: 13, marginTop: 16, fontWeight: 600 }}>{searchParams.ok}</p> : null}
      {searchParams.error ? <p style={{ color: '#dc2626', fontSize: 13, marginTop: 16 }}>처리에 실패했습니다: {searchParams.error}</p> : null}
      {dbError ? <p style={{ color: '#dc2626', fontSize: 13, marginTop: 16 }}>목록을 불러오지 못했습니다: {dbError}</p> : null}

      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.length === 0 ? (
          <div style={{ border: '1px dashed #dddddd', borderRadius: 12, padding: 28, textAlign: 'center', color: '#6a6a6a', fontSize: 13 }}>해당 상태의 일정이 없습니다.</div>
        ) : rows.map((r) => {
          const s = STATUS[r.status] ?? { text: r.status, bg: '#f5f5f5', fg: '#6a6a6a' };
          const o = r.orderId ? orders.get(r.orderId) : undefined;
          const open = searchParams.plan === r.id || r.status === 'help_requested';
          const contact = [r.contact?.name, r.contact?.phone, r.contact?.messenger].filter(Boolean).join(' · ');
          return (
            <details key={r.id} open={open} style={{ border: `1px solid ${searchParams.plan === r.id ? '#ff385c' : '#ebebeb'}`, borderRadius: 12, background: '#fff' }}>
              <summary style={{ cursor: 'pointer', listStyle: 'none', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
                <span style={{ background: s.bg, color: s.fg, borderRadius: 9999, padding: '3px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{s.text}</span>
                <b>{TRIP_TYPE_KO[r.tripType ?? ''] ?? '여행'}</b>
                <span style={{ color: '#3f3f3f' }}>{r.email ?? '(비회원)'}</span>
                {r.startYmd ? <span style={{ color: '#6a6a6a' }}>출발 {r.startYmd}</span> : null}
                {contact ? <span style={{ color: '#6a6a6a' }}>{contact}</span> : null}
                {o ? <span style={{ color: '#be185d', fontWeight: 600 }}>{o.invoiceNo} · ₩{o.totalWon.toLocaleString('ko-KR')} · {o.status}</span> : null}
                <span style={{ marginLeft: 'auto', color: '#9c9c9c', fontSize: 11 }}>{r.locale} · {new Date(r.updatedAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </summary>
              <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#6a6a6a', marginBottom: 6 }}>고객이 확정한 AI 일정</div>
                  <div className="plan-md" style={{ border: '1px solid #f0f0f0', borderRadius: 10, padding: '10px 14px', fontSize: 13, lineHeight: 1.6, maxHeight: 520, overflowY: 'auto', background: '#fafafa' }}
                    dangerouslySetInnerHTML={{ __html: mdToHtml(r.planMd ?? '') }} />
                  <style dangerouslySetInnerHTML={{ __html: '.plan-md h2{font-size:14px;margin:12px 0 4px}.plan-md h3,.plan-md h4{font-size:13px;margin:10px 0 4px}.plan-md ul,.plan-md ol{padding-left:18px;margin:4px 0}.plan-md p{margin:5px 0}.plan-md a{color:#c81e42}' }} />
                </div>
                <div>
                  {r.status === 'paid' ? (
                    <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: 14, fontSize: 13, color: '#047857', fontWeight: 600 }}>
                      결제 확인됨 · 스케줄 완성 (₩{(r.quoteWon ?? 0).toLocaleString('ko-KR')})
                      {r.quoteNote ? <div style={{ fontWeight: 400, color: '#3f3f3f', marginTop: 8, whiteSpace: 'pre-wrap' }}>{r.quoteNote}</div> : null}
                    </div>
                  ) : (
                    <form action={issueQuoteAction} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input type="hidden" name="planId" value={r.id} />
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#6a6a6a' }}>검증된 최종 일정 (마크다운 · 고객 이메일과 화면에 그대로 표시)</label>
                      <textarea name="verifiedPlanMd" defaultValue={r.verifiedPlanMd ?? r.planMd ?? ''} rows={14}
                        style={{ border: '1px solid #dddddd', borderRadius: 10, padding: 10, fontSize: 12, fontFamily: 'ui-monospace, monospace', lineHeight: 1.5 }} />
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#6a6a6a' }}>검증 메모 (병원·업체 확인 결과, 변경 사항, 포함 내역)</label>
                      <textarea name="quoteNote" defaultValue={r.quoteNote ?? ''} rows={4} placeholder="예: 도자기의원 12/3 오후 상담 가능 확인. 호텔은 2박 조식 포함. 통역 반일 포함."
                        style={{ border: '1px solid #dddddd', borderRadius: 10, padding: 10, fontSize: 13, fontFamily: 'inherit', lineHeight: 1.5 }} />
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#6a6a6a' }}>견적 금액 (원, 전액 결제)</label>
                      <input name="quoteWon" defaultValue={r.quoteWon ?? ''} inputMode="numeric" placeholder="예: 1850000"
                        style={{ border: '1px solid #dddddd', borderRadius: 10, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit' }} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        <button type="submit" style={{ background: '#ff385c', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {r.status === 'quoted' ? '재견적 발행 (기존 인보이스 취소)' : '견적 발행 + 고객 이메일'}
                        </button>
                        {r.status !== 'cancelled' ? (
                          <button type="submit" formAction={cancelPlanAction} style={{ background: '#fff', color: '#6a6a6a', border: '1px solid #dddddd', borderRadius: 10, padding: '10px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
                        ) : null}
                      </div>
                      {r.status === 'confirmed' || r.status === 'help_declined' ? (
                        <p style={{ fontSize: 11, color: '#9c9c9c', margin: 0 }}>고객이 아직 도움을 요청하지 않은 일정입니다. 필요하면 직접 견적을 발행해 이메일로 제안할 수 있습니다.</p>
                      ) : null}
                    </form>
                  )}
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
