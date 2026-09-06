import 'server-only';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { categoryListings } from '@/drizzle/schema/category-listings';
import { sendAdminTelegram } from '@/lib/notify/admin-alert';
import { cancelTossPayment } from '@/lib/payments/toss';
import { reverseOrder } from '@/lib/referral/service';
import { sendTripEmail } from '@/lib/ai/trip-planner';
import { estimateRefund, refundCategoryOfListingCategory, type RefundCategory, type RefundEstimate } from './policy';

/**
 * 취소·환불 흐름
 *   소비자(/me) 취소 버튼 → requestCancel()
 *     - 미결제(issued): 즉시 취소
 *     - 결제(paid) / 입금 신고(reported): meta.cancelRequest 기록 + 텔레그램 → 마스터가 환불 확정
 *   마스터(/master/orders) 환불·취소 확정 → refundAndCancel()
 *     - 토스 결제(meta.tossPaymentKey): 토스 취소 API 로 전액/부분 환불 (카카오페이 등 간편결제 포함)
 *     - 알리페이 QR: 수동 송금 — 기록만 남김
 *     - 마진 원장 환수(reverseOrder) + status cancelled + 고객 이메일
 */
type OrderRow = typeof checkoutOrders.$inferSelect;

export type CancelRequestMeta = { at: string; reason: string | null; category: RefundCategory; pct: number; refundWon: number; daysBefore: number };
export type CancelMeta = { at: string; by: 'consumer' | 'master'; refundWon: number; method: 'toss' | 'alipay_manual' | 'none'; note?: string | null; tossTransactionKey?: string | null };
type OrderMeta = { voucher?: { checkedInAt?: string }; tossPaymentKey?: string; cancelRequest?: CancelRequestMeta; cancel?: CancelMeta; depositWon?: number };

export async function resolveRefundCategory(o: OrderRow): Promise<RefundCategory> {
  if (o.hospitalName || o.procedureCategory) return 'medical';
  if (o.listingSlug) {
    const [p] = await db.select({ category: partnerListings.category }).from(partnerListings).where(eq(partnerListings.slug, o.listingSlug)).limit(1);
    if (p) return refundCategoryOfListingCategory(p.category);
    const [c] = await db.select({ key: categoryListings.categoryKey }).from(categoryListings).where(eq(categoryListings.procedureSlug, o.listingSlug)).limit(1);
    if (c) return refundCategoryOfListingCategory(c.key, { medical: c.key !== 'partner' });
  }
  return 'travel';
}

/** 여러 주문의 환불 카테고리를 쿼리 2번으로 — 마이페이지·마스터 목록용 */
export async function resolveRefundCategories(orders: OrderRow[]): Promise<Map<string, RefundCategory>> {
  const out = new Map<string, RefundCategory>();
  const slugs = [...new Set(orders.map((o) => o.listingSlug).filter((s): s is string => Boolean(s)))];
  const pMap = new Map<string, string>();
  const cMap = new Map<string, string>();
  if (slugs.length) {
    const ps = await db.select({ slug: partnerListings.slug, category: partnerListings.category }).from(partnerListings).where(inArray(partnerListings.slug, slugs));
    for (const p of ps) pMap.set(p.slug, p.category);
    const cs = await db.select({ slug: categoryListings.procedureSlug, key: categoryListings.categoryKey }).from(categoryListings).where(inArray(categoryListings.procedureSlug, slugs));
    for (const c of cs) if (!cMap.has(c.slug)) cMap.set(c.slug, c.key);
  }
  for (const o of orders) {
    if (o.hospitalName || o.procedureCategory) { out.set(o.id, 'medical'); continue; }
    const p = o.listingSlug ? pMap.get(o.listingSlug) : undefined;
    if (p) { out.set(o.id, refundCategoryOfListingCategory(p)); continue; }
    const c = o.listingSlug ? cMap.get(o.listingSlug) : undefined;
    if (c) { out.set(o.id, refundCategoryOfListingCategory(c, { medical: c !== 'partner' })); continue; }
    out.set(o.id, 'travel');
  }
  return out;
}

export function orderEstimate(o: OrderRow, category: RefundCategory, now = new Date()): RefundEstimate {
  return estimateRefund({ category, reserveYmd: o.reserveYmd, reserveTime: o.reserveTime, totalWon: o.totalWon, now });
}

/** 소비자가 취소할 수 있는 상태인가 (버튼 노출 판단). */
export function cancellableByConsumer(o: OrderRow): { ok: true } | { ok: false; reason: 'cancelled' | 'checked_in' | 'requested' } {
  const m = (o.meta ?? {}) as OrderMeta;
  if (o.status === 'cancelled') return { ok: false, reason: 'cancelled' };
  if (m.voucher?.checkedInAt) return { ok: false, reason: 'checked_in' };
  if (m.cancelRequest) return { ok: false, reason: 'requested' };
  return { ok: true };
}

export type RequestCancelResult =
  | { ok: true; mode: 'cancelled' | 'requested'; estimate: RefundEstimate }
  | { ok: false; reason: 'forbidden' | 'cancelled' | 'checked_in' | 'requested' | 'not_found' };

export async function requestCancel(orderId: string, userId: string, reason: string | null): Promise<RequestCancelResult> {
  const [o] = await db.select().from(checkoutOrders).where(eq(checkoutOrders.id, orderId)).limit(1);
  if (!o) return { ok: false, reason: 'not_found' };
  if (!o.userId || o.userId !== userId) return { ok: false, reason: 'forbidden' };
  const can = cancellableByConsumer(o);
  if (!can.ok) return { ok: false, reason: can.reason };
  const category = await resolveRefundCategory(o);
  const est = orderEstimate(o, category);
  const now = new Date().toISOString();
  const note = reason?.trim().slice(0, 500) || null;

  if (o.status === 'issued') {
    const cancel: CancelMeta = { at: now, by: 'consumer', refundWon: 0, method: 'none', note };
    await db.execute(sql`update checkout_orders set status = 'cancelled', meta = coalesce(meta,'{}'::jsonb) || ${JSON.stringify({ cancel })}::jsonb, updated_at = now() where id = ${o.id}`);
    await sendAdminTelegram(`<b>🗑 미결제 예약 취소 (고객)</b>\n<code>${o.invoiceNo}</code> · ${esc(o.listingTitle)}\n${note ? `사유: ${esc(note)}` : ''}`).catch(() => false);
    return { ok: true, mode: 'cancelled', estimate: est };
  }
  const cancelRequest: CancelRequestMeta = { at: now, reason: note, category, pct: est.pct, refundWon: est.refundWon, daysBefore: est.daysBefore };
  await db.execute(sql`update checkout_orders set meta = coalesce(meta,'{}'::jsonb) || ${JSON.stringify({ cancelRequest })}::jsonb, updated_at = now() where id = ${o.id}`);
  await sendAdminTelegram(
    `<b>↩️ 취소 요청 (고객)</b>\n<code>${o.invoiceNo}</code> · ${esc(o.listingTitle)}\n상태: ${o.status} · 결제 ₩${o.totalWon.toLocaleString('ko-KR')}\n규정: ${category} · ${est.daysBefore}일 전 · ${est.pct}% → 예상 환불 ₩${est.refundWon.toLocaleString('ko-KR')}${note ? `\n사유: ${esc(note)}` : ''}\n→ 마스터 주문 화면에서 환불·취소 확정`,
  ).catch(() => false);
  return { ok: true, mode: 'requested', estimate: est };
}

export type RefundResult = { ok: true; method: CancelMeta['method']; refundWon: number } | { ok: false; error: string };

/** 마스터: 환불 실행 + 주문 취소. refundWon 0 이면 환불 없이 취소만. */
export async function refundAndCancel(orderId: string, input: { refundWon: number; note?: string | null }): Promise<RefundResult> {
  const [o] = await db.select().from(checkoutOrders).where(eq(checkoutOrders.id, orderId)).limit(1);
  if (!o) return { ok: false, error: '주문이 없습니다' };
  if (o.status === 'cancelled') return { ok: false, error: '이미 취소된 주문입니다' };
  const m = (o.meta ?? {}) as OrderMeta;
  const refundWon = Math.max(0, Math.min(Math.round(input.refundWon), o.totalWon));
  let method: CancelMeta['method'] = 'none';
  let tossTransactionKey: string | null = null;
  if (o.status === 'paid' && refundWon > 0) {
    if (m.tossPaymentKey) {
      const r = await cancelTossPayment({ paymentKey: m.tossPaymentKey, cancelReason: (input.note?.trim() || '고객 요청 취소').slice(0, 200), cancelAmount: refundWon < o.totalWon ? refundWon : undefined });
      if (!r.ok) return { ok: false, error: `토스 취소 실패: ${r.errorCode} ${r.errorMessage}` };
      method = 'toss';
      tossTransactionKey = r.cancels?.[r.cancels.length - 1]?.canceledAt ?? null;
    } else {
      method = 'alipay_manual';
    }
  }
  try { await reverseOrder(o.id, input.note?.trim() || '고객 요청 취소'); } catch { /* 마진 행 없음 등 — 아래에서 상태만 확정 */ }
  const cancel: CancelMeta = { at: new Date().toISOString(), by: 'master', refundWon, method, note: input.note?.trim() || null, tossTransactionKey };
  await db.execute(sql`update checkout_orders set status = 'cancelled', meta = coalesce(meta,'{}'::jsonb) || ${JSON.stringify({ cancel })}::jsonb, updated_at = now() where id = ${o.id}`);

  const won = `₩${refundWon.toLocaleString('ko-KR')}`;
  await sendAdminTelegram(`<b>✅ 취소·환불 확정</b>\n<code>${o.invoiceNo}</code> · ${esc(o.listingTitle)}\n환불 ${won} · ${method === 'toss' ? '토스 취소 API' : method === 'alipay_manual' ? '알리페이 수동 송금 필요' : '환불 없음'}`).catch(() => false);
  if (o.userEmail) {
    const isKo = o.locale === 'kr';
    const subject = isKo ? `[GlowUpTour] 예약 취소 안내 · ${o.invoiceNo}` : `[GlowUpTour] Booking cancelled · ${o.invoiceNo}`;
    const methodText = method === 'toss'
      ? (isKo ? '결제하신 수단(카드·간편결제)으로 환불 처리되었습니다. 카드사에 따라 3~5영업일 걸릴 수 있습니다.' : 'Refunded to your original payment method (card / wallet). It may take 3–5 business days.')
      : method === 'alipay_manual'
        ? (isKo ? '알리페이 계정으로 3~7영업일 안에 송금됩니다.' : 'The refund will be sent to your Alipay account within 3–7 business days.')
        : (isKo ? '환불 대상 금액이 없습니다.' : 'No refundable amount applies.');
    const html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#222">
      <h2 style="font-size:18px">${isKo ? '예약이 취소되었습니다' : 'Your booking has been cancelled'}</h2>
      <p><b>${esc(o.listingTitle)}</b><br/>${o.invoiceNo} · ${o.reserveDate} ${o.reserveTime}</p>
      <p>${isKo ? '환불 금액' : 'Refund'}: <b>${won}</b> (${isKo ? '결제' : 'paid'} ₩${o.totalWon.toLocaleString('ko-KR')})<br/>${methodText}</p>
      ${cancel.note ? `<p style="color:#6a6a6a">${esc(cancel.note)}</p>` : ''}
      <p style="color:#6a6a6a;font-size:12px">GlowUpTour · glowuptour.com</p></div>`;
    await sendTripEmail(o.userEmail, subject, html).catch(() => false);
  }
  return { ok: true, method, refundWon };
}

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c);
}
