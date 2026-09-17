import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { sendAdminTelegram } from '@/lib/notify/admin-alert';
import { sendTripEmail } from '@/lib/ai/trip-planner';
import { voucherUrl } from '@/lib/voucher/token';

/**
 * 병원 진료 예약 요청 — 병원 상세의 '문의 보내기' 가 만드는 무료 예약.
 *
 * 흐름: 환자 요청(checkout_orders kind=hospital_visit, status=issued)
 *  → 운영자가 병원과 일정 확인 뒤 /master/orders 에서 '예약 확정'(status=paid + reserveConfirmedAt)
 *  → 마이페이지에 QR 예약증(/me/voucher) 생성, 환자에게 이메일·텔레그램 안내
 *  → 병원이 QR 을 읽고 /v/<token> 에서 '환자 방문 확인'(계정 없어도 됨) → 소비자·병원·플랫폼이 같은 상태를 본다.
 *
 * 결제 주문과 같은 테이블·바우처·체크인 코드를 그대로 타되, 금액은 0 이고
 * 'paid' 는 "확정" 의 뜻으로 쓴다 — 바우처(QR)·체크인은 paid 주문에만 열리기 때문.
 */
export const HOSPITAL_VISIT_KIND = 'hospital_visit';

export type HospitalVisitMeta = {
  hospitalVisit: true;
  hospitalId: string;
  gender: string;
  phone: string;
  messengerType: string;
  messengerId: string;
  email: string | null;
  birthDate: string;
  visitYmd: string;
  visitTime: string;
  memo: string;
  interests: string[];
  conversationId: string | null;
  source: 'hospital_inquiry';
  portalLocale: string;
  reserveConfirmedAt?: string;
};

/** GU-20260917-4821 — 결제 주문과 같은 인보이스 번호 체계. 충돌은 호출부가 재시도. */
function makeInvoiceNo(): string {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `GU-${ymd}-${rand}`;
}

export function formatReserveDate(ymd: string, locale: string): string {
  const d = new Date(`${ymd}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  const loc = locale === 'kr' ? 'ko-KR' : locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : locale === 'ru' ? 'ru-RU' : locale === 'vi' ? 'vi-VN' : 'en-US';
  return d.toLocaleDateString(loc, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul' });
}

/** 병원 QR 화면(비로그인)에 보여줄 이름 — 홍*동. */
export function maskName(name: string): string {
  const s = name.trim();
  if (s.length <= 1) return s;
  if (s.length === 2) return `${s[0]}*`;
  return `${s[0]}${'*'.repeat(Math.min(s.length - 2, 6))}${s[s.length - 1]}`;
}

export type HospitalVisitRequestInput = {
  locale: string;
  hospitalId: string;
  hospitalName: string;
  name: string;
  gender: string;
  countryCode: string;
  phone: string;
  messengerType: string;
  messengerId: string;
  email: string | null;
  birthDate: string;
  visitYmd: string;
  visitTime: string;
  memo: string;
  interests: string[];
  conversationId: string | null;
  userId: string | null;
  userEmail: string | null;
};

export async function createHospitalVisitRequest(input: HospitalVisitRequestInput): Promise<{ orderId: string; invoiceNo: string }> {
  const meta: HospitalVisitMeta = {
    hospitalVisit: true, hospitalId: input.hospitalId, gender: input.gender, phone: input.phone, messengerType: input.messengerType,
    messengerId: input.messengerId, email: input.email, birthDate: input.birthDate, visitYmd: input.visitYmd, visitTime: input.visitTime,
    memo: input.memo, interests: input.interests, conversationId: input.conversationId, source: 'hospital_inquiry', portalLocale: input.locale,
  };
  for (let i = 0; i < 5; i++) {
    try {
      const [r] = await db.insert(checkoutOrders).values({
        invoiceNo: makeInvoiceNo(), locale: input.locale, listingSlug: null, listingTitle: `${input.hospitalName} 진료 예약`.slice(0, 120), interestKey: HOSPITAL_VISIT_KIND,
        reserveDate: formatReserveDate(input.visitYmd, input.locale), reserveYmd: input.visitYmd, reserveTime: input.visitTime, guests: 1,
        unitPriceWon: 0, subtotalWon: 0, serviceFeeWon: 0, totalWon: 0, paymentMethod: 'none', status: 'issued',
        userId: input.userId, userEmail: input.userEmail ?? input.email, kind: HOSPITAL_VISIT_KIND,
        hospitalName: input.hospitalName, patientLabel: input.name,
        guestName: input.name, guestContact: `${input.phone} · ${input.messengerType} ${input.messengerId}`.slice(0, 200), guestCountryCode: input.countryCode,
        meta,
      }).returning({ id: checkoutOrders.id, invoiceNo: checkoutOrders.invoiceNo });
      if (r) return { orderId: r.id, invoiceNo: r.invoiceNo };
    } catch { /* 인보이스 번호 충돌 — 재시도 */ }
  }
  throw new Error('예약 요청 번호를 발급하지 못했습니다');
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 운영자 확정 — 날짜·시간을 바꿔 확정할 수 있다. 멱등(이미 확정이면 날짜만 갱신). */
export async function confirmHospitalVisit(orderId: string, patch: { visitYmd?: string; visitTime?: string }): Promise<{ ok: true; invoiceNo: string; emailed: boolean } | { ok: false; reason: string }> {
  const [o] = await db.select().from(checkoutOrders).where(eq(checkoutOrders.id, orderId)).limit(1);
  if (!o || o.kind !== HOSPITAL_VISIT_KIND) return { ok: false, reason: '병원 진료 예약 요청이 아닙니다' };
  if (o.status === 'cancelled') return { ok: false, reason: '취소된 요청입니다' };
  const meta = (o.meta ?? {}) as Partial<HospitalVisitMeta>;
  const visitYmd = patch.visitYmd || o.reserveYmd || meta.visitYmd || '';
  const visitTime = patch.visitTime || o.reserveTime;
  const now = new Date();
  await db.update(checkoutOrders).set({
    status: 'paid', paidAt: o.paidAt ?? now,
    reserveYmd: visitYmd || o.reserveYmd, reserveDate: visitYmd ? formatReserveDate(visitYmd, o.locale) : o.reserveDate, reserveTime: visitTime,
    meta: { ...meta, visitYmd, visitTime, reserveConfirmedAt: meta.reserveConfirmedAt ?? now.toISOString() },
    updatedAt: now,
  }).where(eq(checkoutOrders.id, o.id));

  const url = voucherUrl(o.id);
  const myPage = `${(process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.glowuptour.com').replace(/\/$/, '')}/${o.locale}/me/voucher/${encodeURIComponent(o.invoiceNo)}`;
  await sendAdminTelegram(
    `<b>🏥 진료 예약 확정</b>\n<code>${o.invoiceNo}</code> · ${esc(o.hospitalName ?? '')}\n환자: ${esc(o.guestName ?? '')} (${esc(o.guestCountryCode ?? '')}) · ${esc(o.guestContact ?? '')}\n예약: ${esc(visitYmd)} ${esc(visitTime)}\nQR: ${url}`,
  ).catch(() => false);

  const to = o.userEmail || meta.email || null;
  let emailed = false;
  if (to) {
    const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,'Noto Sans KR',sans-serif;background:#f7f7f7;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #ebebeb;">
    <div style="font-size:12px;color:#ff385c;font-weight:800;letter-spacing:.06em;">GLOWUPTOUR</div>
    <h1 style="font-size:20px;margin:8px 0 4px;">진료 예약이 확정되었습니다 · Booking confirmed</h1>
    <p style="font-size:14px;color:#6a6a6a;margin:0 0 16px;">${esc(o.hospitalName ?? '')}</p>
    <table style="width:100%;font-size:14px;border-collapse:collapse;">
      <tr><td style="color:#6a6a6a;padding:6px 0;">예약 · Booking</td><td style="text-align:right;font-weight:700;">${esc(visitYmd)} ${esc(visitTime)}</td></tr>
      <tr><td style="color:#6a6a6a;padding:6px 0;">예약자 · Patient</td><td style="text-align:right;font-weight:700;">${esc(o.guestName ?? '')}</td></tr>
      <tr><td style="color:#6a6a6a;padding:6px 0;">번호 · Ref</td><td style="text-align:right;font-weight:700;">${esc(o.invoiceNo)}</td></tr>
    </table>
    <p style="font-size:14px;line-height:1.6;margin:18px 0 8px;">방문 시 아래 QR 예약증을 병원 접수 데스크에 보여주세요. 병원이 확인하면 예약이 마무리됩니다.<br/>Show the QR booking pass at the clinic desk; the clinic confirms your visit on the spot.</p>
    <p style="margin:16px 0;"><a href="${myPage}" style="display:inline-block;background:#ff385c;color:#fff;text-decoration:none;font-weight:800;border-radius:10px;padding:12px 18px;">QR 예약증 보기 · Open QR pass</a></p>
    <p style="font-size:12px;color:#9a9a9a;line-height:1.6;">회원이 아니거나 로그인이 어려우면 이 링크로도 확인할 수 있습니다:<br/><a href="${url}" style="color:#1d4ed8;">${url}</a></p>
    <p style="text-align:center;font-size:11px;color:#9a9a9a;margin:16px 0 0;">© 글로우업투어 · 주식회사 쉐어아트 · glowuptour.com</p>
  </div></body></html>`;
    emailed = await sendTripEmail(to, `[글로우업투어] ${o.hospitalName ?? '병원'} 진료 예약 확정 · ${visitYmd} ${visitTime}`, html).catch(() => false);
  }
  return { ok: true, invoiceNo: o.invoiceNo, emailed };
}
