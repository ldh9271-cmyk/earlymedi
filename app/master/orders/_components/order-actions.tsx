import ConfirmForm from './confirm-form';
import ReturnTo from './return-to';
import type { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { payLinkFor } from '@/lib/quote/service';
import { isRequestKind, type StayRequestMeta } from '@/lib/stay/request';
import { orderEstimate, type CancelMeta, type CancelRequestMeta } from '@/lib/refund/service';
import type { RefundCategory } from '@/lib/refund/policy';
import { SETTLEMENT_STATUS_KO } from '@/lib/voucher/settlement';
import type { VoucherMeta } from '@/lib/voucher/token';
import {
  markOrderPaidAction, cancelOrderAction, confirmReservationAction, settleHospitalActualAction,
  setMerchantSettlementStatusAction, masterDeclareSettlementAction, refundCancelOrderAction,
  confirmHospitalVisitAction, issueQuoteFromRequestAction,
} from '../_actions';

/**
 * 예약 인보이스 처리 버튼 묶음 — 목록(/master/orders) 의 '처리' 칸과 상세(/master/orders/[id]) 의
 * '처리' 카드가 같은 컴포넌트를 쓴다. 각 폼은 <ReturnTo /> 로 현재 경로를 보내,
 * 상세 페이지에서 누르면 상세로 돌아온다(_actions.ts back()).
 *
 *  - 진료 예약 확정 / 입금 확인 / 예약 확정(예약금) / 취소 — 되돌리기 어려운 동작은 ConfirmForm 확인 창
 *  - StayQuoteBox: 호텔·예약 요청 → 견적 발행, 견적 → 메신저용 결제 링크
 *  - CancelRefundBox: 결제 건 취소·환불(토스 취소 API / 알리페이 수동)
 *  - HospitalSettleBox: 파트너 귀속 의료상품 병원 실결제액 정산
 *  - MerchantSettleBox: QR 방문 확인 뒤 가맹점 최종금액 · 수수료 정산
 */
export function OrderActions({ order: r, category }: { order: typeof checkoutOrders.$inferSelect; category: RefundCategory }): JSX.Element {
  return (
    <div>
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {r.kind === 'hospital_visit' && r.status === 'issued' ? (
        <ConfirmForm action={confirmHospitalVisitAction} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}
          message={`${r.invoiceNo} · ${r.hospitalName ?? ''}\n확정 일시: {visitYmd} {visitTime}\n병원과 이 시간에 진료 가능한지 확인했나요? 확정하면 환자 마이페이지에 QR 예약증이 생기고 환자에게 안내됩니다.`}>
          <input type="hidden" name="id" value={r.id} /><ReturnTo />
          <input type="date" name="visitYmd" defaultValue={r.reserveYmd ?? ''} style={{ border: '1px solid #dddddd', borderRadius: 8, padding: '5px 8px', fontSize: 12, fontFamily: 'inherit' }} />
          <input type="time" name="visitTime" defaultValue={r.reserveTime} step={1800} style={{ border: '1px solid #dddddd', borderRadius: 8, padding: '5px 8px', fontSize: 12, fontFamily: 'inherit' }} />
          <button type="submit" style={btnStyle('#1d4ed8')}>🏥 예약 확정</button>
        </ConfirmForm>
      ) : null}
      {r.kind !== 'hospital_visit' && r.kind !== 'stay_request' && r.kind !== 'booking_request' && r.status !== 'paid' && r.status !== 'cancelled' ? (
        <ConfirmForm action={markOrderPaidAction} message={`${r.invoiceNo} · ₩${r.totalWon.toLocaleString('ko-KR')}\n입금(결제)이 실제로 확인되었나요? 확인 처리하면 고객에게 결제 완료로 표시되고 QR 바우처가 열립니다.`}>
          <input type="hidden" name="id" value={r.id} /><ReturnTo />
          <button type="submit" style={btnStyle('#047857')}>입금 확인</button>
        </ConfirmForm>
      ) : null}
      {r.status === 'paid' && (r.meta as { depositWon?: number } | null)?.depositWon ? (
        (r.meta as { reserveConfirmedAt?: string } | null)?.reserveConfirmedAt ? (
          <span
            style={{
              background: '#ecfdf5', color: '#047857', borderRadius: 9999,
              padding: '4px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
            }}
          >
            예약 확정됨
          </span>
        ) : (
          <ConfirmForm action={confirmReservationAction} message={`${r.invoiceNo} · ${r.reserveDate} ${r.reserveTime}\n파트너와 해당 시간 예약 가능 여부를 확인했나요? 확정하면 고객에게 '예약 확정'으로 표시됩니다.`}>
            <input type="hidden" name="id" value={r.id} /><ReturnTo />
            <button type="submit" style={btnStyle('#1d4ed8')} title="파트너와 해당 시간 가능 여부 확인 후 확정">
              예약 확정
            </button>
          </ConfirmForm>
        )
      ) : null}
      {(r.meta as { voucher?: { checkedInAt?: string; checkedInByName?: string } } | null)?.voucher?.checkedInAt ? (
        <span
          title={(r.meta as { voucher?: { checkedInByName?: string } }).voucher?.checkedInByName ?? ''}
          style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 9999, padding: '4px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}
        >
          방문 확인 {new Date((r.meta as { voucher: { checkedInAt: string } }).voucher.checkedInAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      ) : null}
      {r.status !== 'cancelled' && r.status !== 'paid' ? (
        <ConfirmForm action={cancelOrderAction} message={`${r.invoiceNo} · ${r.listingTitle}\n이 주문을 취소합니다. 결제 전 주문이라 환불은 없습니다. 진행할까요?`}>
          <input type="hidden" name="id" value={r.id} /><ReturnTo />
          <button type="submit" style={btnStyle('#6a6a6a')}>취소</button>
        </ConfirmForm>
      ) : null}
    </div>
    <StayQuoteBox order={r} />
    <CancelRefundBox order={r} category={category} />
    <HospitalSettleBox order={r} />
    <MerchantSettleBox order={r} />
    </div>
  );
}

/**
 * 병원 실결제액 확정 박스 — 파트너 귀속 의료상품 주문(paid + 진료과 스탬프)에만
 * 표시. 수수료 원장은 플랫폼 결제액이 아니라 여기 입력한 병원 실결제액으로
 * 만들어진다. 정산 후에도 금액 정정(재정산)이 가능하다.
 */
function HospitalSettleBox({ order: r }: { order: typeof checkoutOrders.$inferSelect }): JSX.Element | null {
  if (r.status !== 'paid' || !r.distributorId || !r.procedureCategory) return null;
  const meta = (r.meta ?? {}) as { hospitalFeeSettledAt?: string; hospitalActualAmountWon?: number };
  const settled = typeof meta.hospitalActualAmountWon === 'number' && meta.hospitalActualAmountWon > 0;
  const feePct = r.hospitalFeeBp != null ? r.hospitalFeeBp / 100 : null;
  return (
    <div
      style={{
        marginTop: 8, padding: '8px 10px', borderRadius: 10,
        border: `1px solid ${settled ? '#d1fae5' : '#fde3e9'}`,
        background: settled ? '#f0fdf9' : '#fff5f7',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: settled ? '#047857' : '#c2143c' }}>
        {settled
          ? `병원 실결제 ₩${(meta.hospitalActualAmountWon ?? 0).toLocaleString('ko-KR')} 정산됨`
          : '병원 실결제액 확정 대기 — 수수료는 병원 실결제액 기준'}
        {feePct != null ? ` · 요율 ${feePct}%` : ''}
      </div>
      <form
        action={settleHospitalActualAction}
        style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}
      >
        <input type="hidden" name="id" value={r.id} /><ReturnTo />
        <input
          name="actualAmountWon"
          type="number"
          min={10000}
          step={10000}
          required
          placeholder="병원 실결제액 (원)"
          defaultValue={settled ? meta.hospitalActualAmountWon : undefined}
          style={{
            width: 140, border: '1px solid #dddddd', borderRadius: 8,
            padding: '4px 8px', fontSize: 12, fontFamily: 'inherit',
          }}
        />
        <input
          name="procedureYmd"
          type="date"
          defaultValue={r.reserveYmd ?? undefined}
          title="시술일 — 지급 확정은 시술일 + 14일"
          style={{
            border: '1px solid #dddddd', borderRadius: 8,
            padding: '3px 8px', fontSize: 12, fontFamily: 'inherit',
          }}
        />
        <button type="submit" style={btnStyle(settled ? '#6a6a6a' : '#c2143c')}>
          {settled ? '금액 정정' : '실결제 정산'}
        </button>
      </form>
    </div>
  );
}

/**
 * 취소·환불 박스 — 결제(paid) 주문의 "취소·환불" 버튼과 고객 취소 요청 표시.
 * 환불액 기본값은 플랫폼 환불 규정(lib/refund/policy)으로 계산한 예상액(고객 요청이 있으면 요청 당시 값).
 * 마스터가 금액을 고쳐 전액·부분 환불할 수 있고, 확인 창을 한 번 거친다.
 */
function CancelRefundBox({ order: r, category }: { order: typeof checkoutOrders.$inferSelect; category: RefundCategory }): JSX.Element | null {
  const m = (r.meta ?? {}) as { cancelRequest?: CancelRequestMeta; cancel?: CancelMeta; tossPaymentKey?: string; voucher?: { checkedInAt?: string } };
  const won = (n: number): string => `₩${n.toLocaleString('ko-KR')}`;
  if (r.status === 'cancelled') {
    return m.cancel ? (
      <div style={{ marginTop: 6, fontSize: 11, color: '#6a6a6a' }}>
        취소 {new Date(m.cancel.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · 환불 {won(m.cancel.refundWon)}
        {m.cancel.method === 'toss' ? ' (토스 취소 완료)' : m.cancel.method === 'alipay_manual' ? ' (알리페이 수동 송금 필요)' : ''}
        {m.cancel.note ? ` · ${m.cancel.note}` : ''}
      </div>
    ) : null;
  }
  const req = m.cancelRequest ?? null;
  const est = orderEstimate(r, category);
  const defaultRefund = req ? req.refundWon : est.refundWon;
  const tone = req ? { b: '#fecdd3', bg: '#fff5f7', c: '#c2143c' } : { b: '#ebebeb', bg: '#fafafa', c: '#6a6a6a' };
  if (r.status !== 'paid' && !req) return null;
  return (
    <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, border: `1px solid ${tone.b}`, background: tone.bg }}>
      {req ? (
        <div style={{ fontSize: 11, fontWeight: 700, color: tone.c }}>
          ↩️ 고객 취소 요청 {new Date(req.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · 규정 {req.pct}% → {won(req.refundWon)}
          {req.reason ? <div style={{ fontWeight: 500, marginTop: 2 }}>사유: {req.reason}</div> : null}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: tone.c }}>
          지금 취소 시 규정 환불 {est.pct}% → {won(est.refundWon)} ({category}{est.reserveYmd ? ` · ${est.daysBefore}일 전` : ''})
          {m.voucher?.checkedInAt ? ' · 방문 확인됨' : ''}
        </div>
      )}
      {r.status === 'paid' ? (
        <ConfirmForm
          action={refundCancelOrderAction}
          message={`${r.invoiceNo} · ${r.listingTitle}\n₩{refundWon} 을(를) 환불하고 주문을 취소합니다.\n${m.tossPaymentKey ? '토스 결제 — 취소 API 로 즉시 원결제수단(카드·카카오페이)에 환불됩니다.' : '알리페이 QR 결제 — 환불은 수동 송금해야 합니다.'}\n진행할까요?`}
          style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}
        >
          <input type="hidden" name="id" value={r.id} /><ReturnTo />
          <input name="refundWon" inputMode="numeric" defaultValue={defaultRefund} title="환불 금액 (원) — 0 이면 환불 없이 취소"
            style={{ width: 110, border: '1px solid #dddddd', borderRadius: 8, padding: '4px 8px', fontSize: 12, fontFamily: 'inherit' }} />
          <input name="note" placeholder="메모 (고객 이메일에 표시)" style={{ width: 160, border: '1px solid #dddddd', borderRadius: 8, padding: '4px 8px', fontSize: 12, fontFamily: 'inherit' }} />
          <button type="submit" style={btnStyle('#c2143c')}>취소·환불</button>
          <span style={{ fontSize: 10, color: '#9c9c9c' }}>결제 {won(r.totalWon)}</span>
        </ConfirmForm>
      ) : null}
    </div>
  );
}

/**
 * QR 3자 검증 정산 박스 — 방문 확인(체크인)된 주문에만. 가맹점이 입력한 최종
 * 결제금액(meta.voucher.settlement 미러)과 플랫폼 수수료, 소비자 확인 상태를
 * 보여주고 운영자가 확정 · 청구 · 입금 표시를 옮긴다. 가맹점이 금액을 안 넣었으면
 * 여기서 대신 기록할 수 있다.
 */
function MerchantSettleBox({ order: r }: { order: typeof checkoutOrders.$inferSelect }): JSX.Element | null {
  if (r.status !== 'paid') return null;
  const v = (r.meta as { voucher?: VoucherMeta; payOnSiteWon?: number } | null)?.voucher;
  if (!v?.checkedInAt) return null;
  const st = v.settlement ?? null;
  const won = (n: number): string => `₩${n.toLocaleString('ko-KR')}`;
  const pct = (bp: number): string => `${(bp / 100).toFixed(bp % 100 === 0 ? 0 : 2)}%`;
  const tone = !st ? { b: '#fde68a', bg: '#fffbeb', c: '#b45309' }
    : st.status === 'disputed' ? { b: '#fecdd3', bg: '#fff5f7', c: '#c2143c' }
      : st.status === 'declared' ? { b: '#bfdbfe', bg: '#eff6ff', c: '#1d4ed8' }
        : { b: '#d1fae5', bg: '#f0fdf9', c: '#047857' };
  const who = st?.confirmedBy === 'consumer' ? '소비자 확인' : st?.confirmedBy === 'auto' ? '72시간 자동 확정' : st?.confirmedBy === 'master' ? '운영 확정' : '';
  const editable = !st || st.status === 'declared' || st.status === 'disputed' || st.status === 'confirmed';
  return (
    <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, border: `1px solid ${tone.b}`, background: tone.bg }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: tone.c }}>
        {!st
          ? 'QR 방문 확인됨 · 가맹점 최종 결제금액 입력 대기'
          : `최종 ${won(st.finalAmountWon)} · 수수료 ${won(st.feeWon)} (${pct(st.feeBp)}) · ${SETTLEMENT_STATUS_KO[st.status]}${who ? ` (${who})` : ''}`}
      </div>
      {st?.status === 'disputed' && st.disputeNote ? <div style={{ fontSize: 11, color: '#c2143c', marginTop: 2 }}>이의 사유: {st.disputeNote}</div> : null}
      {st?.declaredBy ? <div style={{ fontSize: 11, color: '#6a6a6a', marginTop: 2 }}>입력: {st.declaredBy} · {new Date(st.declaredAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div> : null}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
        {st && (st.status === 'declared' || st.status === 'disputed') ? (
          <form action={setMerchantSettlementStatusAction}>
            <input type="hidden" name="id" value={r.id} /><ReturnTo /><input type="hidden" name="status" value="confirmed" />
            <button type="submit" style={btnStyle('#047857')} title="소비자 응답과 무관하게 운영자가 금액 확정">금액 확정</button>
          </form>
        ) : null}
        {st?.status === 'confirmed' ? (
          <form action={setMerchantSettlementStatusAction}>
            <input type="hidden" name="id" value={r.id} /><ReturnTo /><input type="hidden" name="status" value="invoiced" />
            <button type="submit" style={btnStyle('#1d4ed8')}>수수료 청구됨</button>
          </form>
        ) : null}
        {st?.status === 'invoiced' ? (
          <form action={setMerchantSettlementStatusAction}>
            <input type="hidden" name="id" value={r.id} /><ReturnTo /><input type="hidden" name="status" value="paid" />
            <button type="submit" style={btnStyle('#047857')}>수수료 입금 완료</button>
          </form>
        ) : null}
        {st && st.status !== 'declared' ? (
          <form action={setMerchantSettlementStatusAction}>
            <input type="hidden" name="id" value={r.id} /><ReturnTo /><input type="hidden" name="status" value="declared" />
            <button type="submit" style={btnStyle('#6a6a6a')} title="소비자 확인 대기 상태로 되돌리기">되돌리기</button>
          </form>
        ) : null}
      </div>
      {editable ? (
        <form action={masterDeclareSettlementAction} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
          <input type="hidden" name="id" value={r.id} /><ReturnTo />
          <input name="finalAmountWon" inputMode="numeric" required placeholder="최종 결제금액 (원)"
            defaultValue={st ? st.finalAmountWon : r.totalWon + Number((r.meta as { payOnSiteWon?: number } | null)?.payOnSiteWon ?? 0)}
            style={{ width: 140, border: '1px solid #dddddd', borderRadius: 8, padding: '4px 8px', fontSize: 12, fontFamily: 'inherit' }} />
          <button type="submit" style={btnStyle(st ? '#6a6a6a' : '#b45309')}>{st ? '금액 정정' : '운영자가 기록'}</button>
        </form>
      ) : null}
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

/**
 * 호텔 예약 문의(kind=stay_request) → 금액 입력해 견적 발행 / 견적(kind=quote) → 메신저용 결제 링크.
 * 파트너(호텔)가 /partner/requests 에서 제안한 금액이 있으면 미리 채운다.
 */
function StayQuoteBox({ order }: { order: typeof checkoutOrders.$inferSelect }): JSX.Element | null {
  const r = order;
  if (!isRequestKind(r.kind) && r.kind !== 'quote') return null;
  const mcat = (r.meta as { category?: string; subType?: string } | null) ?? {};
  const isHotel = r.kind === 'stay_request' || mcat.category === 'hotel' || (mcat.category === 'travel_package' && mcat.subType === 'free');
  const meta = (r.meta ?? {}) as Partial<StayRequestMeta> & { quoteNote?: string | null; payToken?: string };
  const s = meta.stay;
  const input: React.CSSProperties = { border: '1px solid #dddddd', borderRadius: 8, padding: '5px 8px', fontSize: 12, fontFamily: 'inherit' };
  return (
    <div style={{ marginTop: 8, padding: 10, border: '1px solid #fecdd3', background: '#fff5f7', borderRadius: 10, fontSize: 12, lineHeight: 1.6, maxWidth: 520 }}>
      {s ? (
        <div>
          <b>{s.name}</b> · {s.contact}{s.countryCode ? ` (${s.countryCode})` : ''}{s.messengerId ? ` · ${s.messengerKind ?? ''} ${s.messengerId}` : ''}
          {r.userEmail ? <span style={{ color: '#047857' }}> · 회원 {r.userEmail}</span> : <span style={{ color: '#b45309' }}> · 비회원(메신저 결제 링크)</span>}
          <br />{isHotel ? '체크인' : '희망일'} {s.checkIn}{s.nights > 0 ? ` · ${s.nights}박` : ''}{s.arrival ? ` · ${isHotel ? '도착' : '시간'} ${s.arrival}` : ''} · {r.guests}명{s.note ? <><br />요청: {s.note}</> : null}
        </div>
      ) : null}
      {meta.partnerQuote ? (
        <div style={{ color: '#1d4ed8', marginTop: 4 }}>🏨 호텔 제안 ₩{meta.partnerQuote.won.toLocaleString('ko-KR')}{meta.partnerQuote.note ? ` · ${meta.partnerQuote.note}` : ''} ({new Date(meta.partnerQuote.at).toLocaleDateString('ko-KR')})</div>
      ) : null}
      {r.status === 'issued' ? (
        <form action={issueQuoteFromRequestAction} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
          <input type="hidden" name="id" value={r.id} /><ReturnTo />
          <input name="amountWon" inputMode="numeric" required placeholder="총 금액(원)" defaultValue={r.kind === 'quote' ? r.totalWon : (meta.partnerQuote?.won ?? (r.subtotalWon > 0 ? r.subtotalWon : ''))} style={{ ...input, width: 110 }} />
          <select name="locale" defaultValue={r.locale || 'kr'} style={input}>
            <option value="kr">한국어</option><option value="en">English</option><option value="ja">日本語</option><option value="zh">中文</option><option value="ru">Русский</option><option value="vi">Tiếng Việt</option>
          </select>
          <input name="note" maxLength={1000} placeholder="고객 메모(객실·포함·조건)" defaultValue={meta.quoteNote ?? meta.partnerQuote?.note ?? ''} style={{ ...input, flex: 1, minWidth: 180 }} />
          <button type="submit" style={btnStyle('#c81e42')}>{r.kind === 'quote' ? '견적 수정·재발송' : isHotel ? '견적 발행 (메일+링크)' : '예약 확인 · 인보이스 발행'}</button>
        </form>
      ) : null}
      {r.kind === 'quote' && meta.payToken ? (
        <div style={{ marginTop: 6, wordBreak: 'break-all' }}>
          <span style={{ color: '#6a6a6a' }}>메신저용 결제 링크: </span>
          <code style={{ fontSize: 11 }}>{payLinkFor(r.locale || 'kr', r.invoiceNo, meta.payToken)}</code>
        </div>
      ) : null}
    </div>
  );
}
