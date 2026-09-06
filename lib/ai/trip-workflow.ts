import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { aiTripPlans, type AiTripPlanRow } from '@/drizzle/schema/ai-trip-plans';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { isPublicLocale, type PublicLocale } from '@/lib/i18n/locales';
import { notifyOrderEvent, sendAdminTelegram } from '@/lib/notify/admin-alert';
import { buildTripEmailHtml, sendTripEmail } from './trip-planner';

/**
 * AI 여행 일정 → 확정 → 플랫폼 도움 → 견적(인보이스) → 결제 → 스케줄 완성.
 *
 *  - 견적은 기존 checkout_orders 인보이스로 발행한다(kind 'travel', 전액). 결제는 예약 팝업과 같은
 *    토스/알리페이 경로를 그대로 타고, 입금 확인(paid)도 /master/orders·토스 confirm/webhook 이 처리한다.
 *  - 주문이 paid 가 되면 onTripOrderPaid 가 일정을 paid 로 올리고 '스케줄 완성' 이메일을 보낸다.
 */
export type TripStatus = 'draft' | 'confirmed' | 'help_declined' | 'help_requested' | 'quoted' | 'paid' | 'cancelled';
export const TRIP_TYPE_KO: Record<string, string> = { free: '자유여행', package: '패키지여행', training: '연수패키지' };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.glowuptour.com';
const won = (n: number): string => `₩${n.toLocaleString('ko-KR')}`;
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function makeInvoiceNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `GU-${ymd}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

export type TripOrderView = { id: string; invoiceNo: string; status: string; totalWon: number } | null;

/** 일정 + 견적 주문. 주문이 paid 인데 일정이 아직 아니면 여기서 동기화한다(웹훅 누락 대비). */
export async function loadTripPlan(planId: string): Promise<{ plan: AiTripPlanRow; order: TripOrderView } | null> {
  const [plan] = await db.select().from(aiTripPlans).where(eq(aiTripPlans.id, planId)).limit(1);
  if (!plan) return null;
  let order: TripOrderView = null;
  if (plan.orderId) {
    const [o] = await db.select({ id: checkoutOrders.id, invoiceNo: checkoutOrders.invoiceNo, status: checkoutOrders.status, totalWon: checkoutOrders.totalWon })
      .from(checkoutOrders).where(eq(checkoutOrders.id, plan.orderId)).limit(1);
    order = o ?? null;
    if (order?.status === 'paid' && plan.status !== 'paid') { await onTripOrderPaid(order.id).catch(() => undefined); plan.status = 'paid'; }
  }
  return { plan, order };
}

/** 컨시어지 견적 발행 — 인보이스 생성 + 일정 갱신 + 고객 이메일 + 운영자 알림. */
export async function issueTripQuote(input: { planId: string; quoteWon: number; quoteNote: string; verifiedPlanMd: string }): Promise<{ ok: true; invoiceNo: string } | { ok: false; error: string }> {
  const [plan] = await db.select().from(aiTripPlans).where(eq(aiTripPlans.id, input.planId)).limit(1);
  if (!plan) return { ok: false, error: 'not_found' };
  if (!plan.userId || !plan.email) return { ok: false, error: '회원 계정이 연결되지 않은 일정입니다 (고객이 먼저 확정해야 합니다)' };
  if (plan.status === 'paid') return { ok: false, error: '이미 결제된 일정입니다' };
  const locale: PublicLocale = isPublicLocale(plan.locale) ? (plan.locale as PublicLocale) : 'kr';
  const typeKo = TRIP_TYPE_KO[plan.tripType ?? ''] ?? '여행';
  const title = `AI 여행 일정 견적 · ${typeKo}`;

  // 기존 견적 주문이 미결제면 취소하고 새로 발행 (재견적)
  if (plan.orderId) {
    await db.update(checkoutOrders).set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(checkoutOrders.id, plan.orderId)).catch(() => undefined);
  }
  let invoiceNo = '';
  let orderId = '';
  for (let attempt = 0; attempt < 5 && !orderId; attempt += 1) {
    const no = makeInvoiceNo();
    try {
      const [row] = await db.insert(checkoutOrders).values({
        invoiceNo: no, locale, listingSlug: null, listingTitle: title, interestKey: 'ai_trip',
        reserveDate: plan.startYmd ?? '일정 협의', reserveYmd: plan.startYmd ?? null, reserveTime: '-', guests: 1,
        unitPriceWon: input.quoteWon, subtotalWon: input.quoteWon, serviceFeeWon: 0, totalWon: input.quoteWon,
        userId: plan.userId, userEmail: plan.email, kind: 'travel',
        meta: { aiTripPlanId: plan.id, quoteNote: input.quoteNote },
      }).returning({ id: checkoutOrders.id, invoiceNo: checkoutOrders.invoiceNo });
      if (row) { invoiceNo = row.invoiceNo; orderId = row.id; }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('duplicate') && !msg.includes('unique')) return { ok: false, error: msg || 'insert_failed' };
    }
  }
  if (!orderId) return { ok: false, error: 'invoice_no_collision' };

  await db.update(aiTripPlans).set({
    status: 'quoted', orderId, quoteWon: input.quoteWon, quoteNote: input.quoteNote, verifiedPlanMd: input.verifiedPlanMd || plan.planMd,
    quotedAt: new Date(), updatedAt: new Date(),
  }).where(eq(aiTripPlans.id, plan.id));

  // 고객 이메일 — 견적 금액·메모·결제 링크
  try {
    const dict = await getDictionary(locale);
    const t = dict.ai.trip;
    const extra = `<div style="border:1px solid #fecdd3;background:#fff5f7;border-radius:12px;padding:14px 16px;margin:0 0 16px;">
      <div style="font-size:13px;color:#6a6a6a;">${esc(t.quoteAmount)}</div>
      <div style="font-size:24px;font-weight:800;color:#c81e42;margin-top:2px;">${won(input.quoteWon)}</div>
      ${input.quoteNote ? `<div style="font-size:13px;color:#3f3f3f;margin-top:10px;line-height:1.6;"><b>${esc(t.quoteNoteLabel)}</b><br/>${esc(input.quoteNote).replace(/\n/g, '<br/>')}</div>` : ''}
      <div style="font-size:12px;color:#9c9c9c;margin-top:8px;">${esc(t.invoiceLabel)} ${invoiceNo}</div>
    </div>`;
    const html = buildTripEmailHtml(input.verifiedPlanMd || plan.planMd || '', { title: t.quoteTitle, emailIntro: t.quoteEmailIntro, disclaimer: t.disclaimer }, locale,
      { extraHtml: extra, ctaHref: `${SITE_URL}/${locale}/ai-trip?plan=${plan.id}`, ctaLabel: t.payBtn });
    await sendTripEmail(plan.email, t.quoteEmailSubject, html);
  } catch { /* 이메일 실패가 견적 발행을 막지 않는다 */ }

  await notifyOrderEvent('issued', {
    invoiceNo, listingTitle: title, totalWon: input.quoteWon, guests: 1, reserveDate: plan.startYmd ?? '일정 협의', reserveTime: '-',
    userEmail: plan.email, locale, contact: [plan.contact?.phone, plan.contact?.messenger].filter(Boolean).join(' · ') || null,
    extra: `AI 여행 견적 발행 — 고객 결제 대기 (${SITE_URL}/master/ai-trips)`,
  }).catch(() => false);
  return { ok: true, invoiceNo };
}

/** 주문 paid → 일정 paid + '스케줄 완성' 이메일 (멱등). 마스터 입금확인·토스 confirm·웹훅에서 호출. */
export async function onTripOrderPaid(orderId: string): Promise<void> {
  const [plan] = await db.select().from(aiTripPlans).where(eq(aiTripPlans.orderId, orderId)).limit(1);
  if (!plan || plan.status === 'paid') return;
  await db.update(aiTripPlans).set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() }).where(eq(aiTripPlans.id, plan.id));
  const locale: PublicLocale = isPublicLocale(plan.locale) ? (plan.locale as PublicLocale) : 'kr';
  if (plan.email) {
    try {
      const dict = await getDictionary(locale);
      const t = dict.ai.trip;
      const html = buildTripEmailHtml(plan.verifiedPlanMd || plan.planMd || '', { title: t.paidTitle, emailIntro: t.paidEmailIntro, disclaimer: t.disclaimer }, locale,
        { ctaHref: `${SITE_URL}/${locale}/me`, ctaLabel: t.voucherLink });
      await sendTripEmail(plan.email, t.paidEmailSubject, html);
    } catch { /* ignore */ }
  }
  await sendAdminTelegram(`<b>✅ AI 여행 스케줄 완성</b>\n${esc(plan.email ?? '')} · ${esc(TRIP_TYPE_KO[plan.tripType ?? ''] ?? '여행')} · ${won(plan.quoteWon ?? 0)}\n${SITE_URL}/master/ai-trips`).catch(() => false);
}
