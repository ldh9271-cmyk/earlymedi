import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { notifyOrderEvent, sendAdminTelegram } from '@/lib/notify/admin-alert';
import { SITE_URL } from '@/lib/seo/brand';
import type { PublicLocale } from '@/lib/i18n/locales';
import { makeInvoiceNo, makePayToken, payLinkFor, sendQuoteEmail } from '@/lib/quote/service';

/**
 * 호텔 예약 문의(가격 미표시 상품) — 상세 팝업에서 이름·연락처·메신저·체크인·박수·도착 시간·인원을 받는다.
 *
 *   kind='stay_request' · status=issued · 금액 0 · paymentMethod 'none' 으로 checkout_orders 에 한 줄.
 *   → /master/orders 와 호텔 파트너 콘솔(/partner/requests, 리스팅 owner_org_id 기준)에 보인다.
 *   → 파트너가 가격을 제안(meta.partnerQuote)하거나 마스터가 바로 금액을 넣어 '견적 발행' 하면
 *     같은 행이 kind='quote' · 토스 · totalWon=금액 으로 바뀌고, 회원 메일 + 메신저용 결제 링크가 나간다.
 *
 * 병원 진료 예약(lib/hospital-visit, kind='hospital_visit')과 같은 "무료 주문" 패턴.
 */
export const STAY_REQUEST_KIND = 'stay_request';

export type StayRequestMeta = {
  stay: {
    name: string; contact: string; countryCode: string | null;
    messengerKind: string | null; messengerId: string | null;
    checkIn: string; nights: number; arrival: string | null; note: string | null;
  };
  /** 리스팅 소유 파트너 조직 — 파트너 콘솔 조회 키 */
  listingOrgId: string | null;
  requestedAt: string;
  payToken: string;
  partnerQuote?: { won: number; note: string | null; at: string; byOrgId: string };
};

export type StayRequestInput = {
  locale: PublicLocale;
  listingSlug: string;
  name: string; contact: string; countryCode: string | null;
  messengerKind: string | null; messengerId: string | null;
  checkIn: string; nights: number; arrival: string | null; guests: number; note: string | null;
  userId: string | null; userEmail: string | null;
};

const esc = (s: string): string => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c);

export async function createStayRequest(input: StayRequestInput): Promise<{ ok: true; orderId: string; invoiceNo: string } | { ok: false; error: string }> {
  const [listing] = await db
    .select({ title: partnerListings.title, category: partnerListings.category, ownerOrgId: partnerListings.ownerOrgId })
    .from(partnerListings).where(eq(partnerListings.slug, input.listingSlug)).limit(1);
  if (!listing) return { ok: false, error: 'listing_not_found' };
  if (listing.category !== 'hotel') return { ok: false, error: 'not_a_hotel' };

  const meta: StayRequestMeta = {
    stay: {
      name: input.name, contact: input.contact, countryCode: input.countryCode,
      messengerKind: input.messengerKind, messengerId: input.messengerId,
      checkIn: input.checkIn, nights: input.nights, arrival: input.arrival, note: input.note,
    },
    listingOrgId: listing.ownerOrgId ?? null,
    requestedAt: new Date().toISOString(),
    payToken: makePayToken(),
  };
  const periodLabel = `${input.nights}박`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const [r] = await db.insert(checkoutOrders).values({
        invoiceNo: makeInvoiceNo(), locale: input.locale, listingSlug: input.listingSlug, listingTitle: listing.title, interestKey: 'hotel',
        reserveDate: input.checkIn, reserveYmd: input.checkIn, reserveTime: input.arrival ? `${periodLabel} · ${input.arrival}` : periodLabel, guests: input.guests,
        unitPriceWon: 0, subtotalWon: 0, serviceFeeWon: 0, totalWon: 0, paymentMethod: 'none', status: 'issued',
        userId: input.userId, userEmail: input.userEmail ?? (input.contact.includes('@') ? input.contact : null), kind: STAY_REQUEST_KIND,
        meta,
      }).returning({ id: checkoutOrders.id, invoiceNo: checkoutOrders.invoiceNo });
      if (!r) continue;
      await sendAdminTelegram(
        `<b>🏨 호텔 예약 문의</b> ${esc(listing.title)}\n` +
        `${esc(input.name)} · ${esc(input.contact)}${input.messengerId ? ` · ${esc(input.messengerKind ?? '')} ${esc(input.messengerId)}` : ''}\n` +
        `체크인 ${esc(input.checkIn)} · ${periodLabel}${input.arrival ? ` · 도착 ${esc(input.arrival)}` : ''} · ${input.guests}명${input.userEmail ? ` · 회원 ${esc(input.userEmail)}` : ' · 비회원'}\n` +
        `${input.note ? `요청: ${esc(input.note).slice(0, 200)}\n` : ''}${SITE_URL}/master/orders`,
      ).catch(() => false);
      return { ok: true, orderId: r.id, invoiceNo: r.invoiceNo };
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (!/unique|duplicate/i.test(msg)) return { ok: false, error: msg || 'insert_failed' };
    }
  }
  return { ok: false, error: 'invoice_no_collision' };
}

/** 파트너 콘솔: 내 조직 호텔로 들어온 예약 문의·견적 (최근 100건, 최신순). */
export async function listStayRequestsForOrg(orgId: string): Promise<Array<typeof checkoutOrders.$inferSelect>> {
  const slugs = await db.select({ slug: partnerListings.slug }).from(partnerListings).where(and(eq(partnerListings.ownerOrgId, orgId), eq(partnerListings.category, 'hotel')));
  const list = slugs.map((s) => s.slug).filter((s): s is string => !!s);
  if (list.length === 0) return [];
  const rows = await db.select().from(checkoutOrders)
    .where(and(inArray(checkoutOrders.listingSlug, list), inArray(checkoutOrders.kind, [STAY_REQUEST_KIND, 'quote'])))
    .orderBy(checkoutOrders.createdAt)
    .limit(100);
  return rows.reverse();
}

/** 파트너(호텔)가 가격을 제안 — 마스터가 보고 그 금액으로 견적을 발행한다. */
export async function proposePartnerPrice(orderId: string, orgId: string, won: number, note: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isFinite(won) || won <= 0) return { ok: false, error: '금액은 1원 이상이어야 합니다' };
  const [o] = await db.select().from(checkoutOrders).where(eq(checkoutOrders.id, orderId)).limit(1);
  if (!o || o.kind !== STAY_REQUEST_KIND) return { ok: false, error: '호텔 예약 문의가 아닙니다' };
  if (o.status === 'cancelled') return { ok: false, error: '취소된 문의입니다' };
  const meta = (o.meta ?? {}) as Partial<StayRequestMeta>;
  // 소유 확인: meta.listingOrgId 또는 리스팅 owner_org_id
  let owns = meta.listingOrgId === orgId;
  if (!owns && o.listingSlug) {
    const [l] = await db.select({ ownerOrgId: partnerListings.ownerOrgId }).from(partnerListings).where(eq(partnerListings.slug, o.listingSlug)).limit(1);
    owns = l?.ownerOrgId === orgId;
  }
  if (!owns) return { ok: false, error: '내 조직의 호텔 문의가 아닙니다' };
  await db.update(checkoutOrders).set({
    meta: { ...meta, partnerQuote: { won: Math.round(won), note, at: new Date().toISOString(), byOrgId: orgId } },
    updatedAt: new Date(),
  }).where(eq(checkoutOrders.id, orderId));
  await sendAdminTelegram(`<b>🏨 호텔 가격 제안</b> ${esc(o.listingTitle)} · ${o.invoiceNo}\n₩${Math.round(won).toLocaleString('ko-KR')}${note ? ` · ${esc(note).slice(0, 160)}` : ''}\n${SITE_URL}/master/orders`).catch(() => false);
  return { ok: true };
}

/**
 * 마스터: 예약 문의 행을 그 자리에서 견적 인보이스로 바꾼다 (kind quote · 토스 · 금액).
 * 회원이면 마이페이지 링크로 메일, 비회원이면 결제 링크(토큰)만 돌려준다 — 메신저로 보내면 된다.
 */
export async function convertStayRequestToQuote(orderId: string, input: { amountWon: number; note: string | null; locale: PublicLocale }): Promise<{ ok: true; invoiceNo: string; payLink: string; emailSent: boolean; member: boolean } | { ok: false; error: string }> {
  if (!Number.isFinite(input.amountWon) || input.amountWon <= 0) return { ok: false, error: '금액은 1원 이상이어야 합니다' };
  const [o] = await db.select().from(checkoutOrders).where(eq(checkoutOrders.id, orderId)).limit(1);
  if (!o) return { ok: false, error: 'not_found' };
  if (o.kind !== STAY_REQUEST_KIND && o.kind !== 'quote') return { ok: false, error: '호텔 예약 문의·견적 행이 아닙니다' };
  if (o.status === 'paid') return { ok: false, error: '이미 결제된 인보이스입니다' };
  if (o.status === 'cancelled') return { ok: false, error: '취소된 행입니다' };
  const meta = (o.meta ?? {}) as Partial<StayRequestMeta> & Record<string, unknown>;
  const payToken = typeof meta.payToken === 'string' && meta.payToken ? meta.payToken : makePayToken();
  const amount = Math.round(input.amountWon);
  await db.update(checkoutOrders).set({
    kind: 'quote', paymentMethod: 'toss', locale: input.locale,
    unitPriceWon: amount, subtotalWon: amount, serviceFeeWon: 0, totalWon: amount,
    meta: { ...meta, payToken, quoteNote: input.note, quotedAt: new Date().toISOString(), quotedBy: 'master' },
    updatedAt: new Date(),
  }).where(eq(checkoutOrders.id, orderId));

  const payLink = payLinkFor(input.locale, o.invoiceNo, payToken);
  const stay = meta.stay;
  const member = !!o.userId;
  let emailSent = false;
  const to = o.userEmail ?? (stay?.contact && stay.contact.includes('@') ? stay.contact : null);
  if (to) {
    emailSent = await sendQuoteEmail({
      to, locale: input.locale, title: o.listingTitle, amountWon: amount, note: input.note,
      dateYmd: o.reserveYmd, periodLabel: stay ? `${stay.nights}박` : o.reserveTime, guests: o.guests, invoiceNo: o.invoiceNo,
      link: member ? `${SITE_URL}/${input.locale}/me?invoice=${encodeURIComponent(o.invoiceNo)}` : payLink,
    });
  }
  await notifyOrderEvent('issued', {
    invoiceNo: o.invoiceNo, listingTitle: `[호텔 견적] ${o.listingTitle}`, totalWon: amount, guests: o.guests,
    reserveDate: o.reserveDate, reserveTime: o.reserveTime, userEmail: o.userEmail ?? stay?.contact ?? null,
  }).catch(() => false);
  return { ok: true, invoiceNo: o.invoiceNo, payLink, emailSent, member };
}
