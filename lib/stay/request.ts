import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from '@/lib/db/client';
import { checkoutOrders } from '@/drizzle/schema/checkout-orders';
import { partnerListings } from '@/drizzle/schema/partner-listings';
import { notifyOrderEvent, sendAdminTelegram } from '@/lib/notify/admin-alert';
import { SITE_URL } from '@/lib/seo/brand';
import type { PublicLocale } from '@/lib/i18n/locales';
import { makeInvoiceNo, makePayToken, payLinkFor, sendQuoteEmail } from '@/lib/quote/service';
import { attributeUser, getAttribution, REF_COOKIE } from '@/lib/referral/service';

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
/** 호텔 외 '예약 요청'(맛집·퍼스널컬러·헤어·메이크업·네일·반영구·사진·K-팝 투어) — 표시 가격은 안내용, 확인 후 견적 */
export const BOOKING_REQUEST_KIND = 'booking_request';
export const REQUEST_KINDS = [STAY_REQUEST_KIND, BOOKING_REQUEST_KIND] as const;
export const isRequestKind = (kind: string): boolean => (REQUEST_KINDS as readonly string[]).includes(kind);
/** 결제 대신 '요청 → 확인 → 견적 인보이스' 흐름을 타는 카테고리 (travel_package·hospital 제외). 2026-10-11 사용자 지시. */
export const REQUEST_CATEGORIES = ['hotel', 'food', 'restaurant', 'personal_color', 'hair', 'makeup', 'nail', 'pmu', 'photo_studio', 'kpop_tour'] as const;
export const isRequestCategory = (c: string): boolean => (REQUEST_CATEGORIES as readonly string[]).includes(c);
/** 여행 패키지: details.subType 'free'(자유여행)는 호텔처럼 견적, 'package'·'training' 은 정가 즉시 결제. 팝업은 모두 같은 정보를 받는다. */
export const isPopupCategory = (c: string): boolean => isRequestCategory(c) || c === 'travel_package';
export type TravelSub = 'free' | 'package' | 'training' | '';
export const travelSubOf = (category: string, details: unknown): TravelSub => {
  if (category !== 'travel_package') return '';
  const v = (details && typeof details === 'object' ? (details as { subType?: unknown }).subType : '') as string;
  return v === 'free' || v === 'package' || v === 'training' ? v : 'package';
};

export type StayRequestMeta = {
  stay: {
    name: string; contact: string; countryCode: string | null;
    messengerKind: string | null; messengerId: string | null;
    checkIn: string; nights: number; arrival: string | null; note: string | null;
  };
  /** 리스팅 소유 파트너 조직 — 파트너 콘솔 조회 키 */
  listingOrgId: string | null;
  /** 리스팅 카테고리 (hotel 이면 숙박 문의, 아니면 예약 요청) */
  category?: string;
  /** 여행 패키지 하위 유형 */
  subType?: string;
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

export type StayRequestResult = { ok: true; orderId: string; invoiceNo: string; pay: boolean; amountWon: number } | { ok: false; error: string };

export async function createStayRequest(input: StayRequestInput): Promise<StayRequestResult> {
  const [listing] = await db
    .select({ title: partnerListings.title, category: partnerListings.category, ownerOrgId: partnerListings.ownerOrgId, priceWon: partnerListings.priceWon, interestKey: partnerListings.interestKey, details: partnerListings.details })
    .from(partnerListings).where(eq(partnerListings.slug, input.listingSlug)).limit(1);
  if (!listing) return { ok: false, error: 'listing_not_found' };
  if (!isPopupCategory(listing.category)) return { ok: false, error: 'not_bookable' };
  const sub = travelSubOf(listing.category, listing.details);
  // 정가 여행(패키지·연수)은 같은 정보를 받고 바로 결제 인보이스를 낸다
  if (sub === 'package' || sub === 'training') return createFixedPriceOrder(input, { title: listing.title, priceWon: listing.priceWon ?? 0, interestKey: listing.interestKey ?? listing.category, ownerOrgId: listing.ownerOrgId ?? null, sub });
  const isHotel = listing.category === 'hotel';
  const priceHidden = isHotel || sub === 'free';
  // 가격 미표시(호텔·자유여행)는 0, 그 외는 표시 가격을 안내용 스냅샷으로 남긴다 (견적 발행 때 기본값). 총액은 확정 전이라 0.
  const unit = priceHidden ? 0 : Math.max(0, listing.priceWon ?? 0);

  const meta: StayRequestMeta = {
    stay: {
      name: input.name, contact: input.contact, countryCode: input.countryCode,
      messengerKind: input.messengerKind, messengerId: input.messengerId,
      checkIn: input.checkIn, nights: isHotel || sub === 'free' ? input.nights : 0, arrival: input.arrival, note: input.note,
    },
    listingOrgId: listing.ownerOrgId ?? null,
    category: listing.category,
    subType: sub || undefined,
    requestedAt: new Date().toISOString(),
    payToken: makePayToken(),
  };
  const periodLabel = isHotel || sub === 'free' ? `${input.nights}박` : null;
  const reserveTime = periodLabel ? (input.arrival ? `${periodLabel} · ${input.arrival}` : periodLabel) : (input.arrival ?? '-');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const [r] = await db.insert(checkoutOrders).values({
        invoiceNo: makeInvoiceNo(), locale: input.locale, listingSlug: input.listingSlug, listingTitle: listing.title, interestKey: isHotel ? 'hotel' : listing.category,
        reserveDate: input.checkIn, reserveYmd: input.checkIn, reserveTime, guests: input.guests,
        unitPriceWon: unit, subtotalWon: unit * input.guests, serviceFeeWon: 0, totalWon: 0, paymentMethod: 'none', status: 'issued',
        userId: input.userId, userEmail: input.userEmail ?? (input.contact.includes('@') ? input.contact : null), kind: isHotel ? STAY_REQUEST_KIND : BOOKING_REQUEST_KIND,
        meta,
      }).returning({ id: checkoutOrders.id, invoiceNo: checkoutOrders.invoiceNo });
      if (!r) continue;
      await sendAdminTelegram(
        `<b>${isHotel ? '🏨 호텔 예약 문의' : sub === 'free' ? '🧳 자유여행 견적 문의' : '📩 예약 요청'}</b> ${esc(listing.title)}${!isHotel && unit > 0 ? ` (표시가 ₩${unit.toLocaleString('ko-KR')} × ${input.guests})` : ''}\n` +
        `${esc(input.name)} · ${esc(input.contact)}${input.messengerId ? ` · ${esc(input.messengerKind ?? '')} ${esc(input.messengerId)}` : ''}\n` +
        `${isHotel ? '체크인' : '희망일'} ${esc(input.checkIn)}${periodLabel ? ` · ${periodLabel}` : ''}${input.arrival ? ` · ${isHotel ? '도착' : '시간'} ${esc(input.arrival)}` : ''} · ${input.guests}명${input.userEmail ? ` · 회원 ${esc(input.userEmail)}` : ' · 비회원'}\n` +
        `${input.note ? `요청: ${esc(input.note).slice(0, 200)}\n` : ''}${SITE_URL}/master/orders`,
      ).catch(() => false);
      return { ok: true, orderId: r.id, invoiceNo: r.invoiceNo, pay: false, amountWon: 0 };
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (!/unique|duplicate/i.test(msg)) return { ok: false, error: msg || 'insert_failed' };
    }
  }
  return { ok: false, error: 'invoice_no_collision' };
}

/**
 * 정가 상품(패키지·연수여행): 같은 예약 정보를 받고 토스 인보이스를 바로 낸다.
 * 금액은 app/api/checkout/order 의 전액 결제 규칙과 같다 — 상품가 × 인원 + 10% 수수료(천원 반올림). 클라이언트 값은 믿지 않는다.
 */
async function createFixedPriceOrder(input: StayRequestInput, l: { title: string; priceWon: number; interestKey: string; ownerOrgId: string | null; sub: TravelSub }): Promise<StayRequestResult> {
  if (!(l.priceWon > 0)) return { ok: false, error: 'no_price' };
  const subtotal = l.priceWon * input.guests;
  const serviceFee = Math.round((subtotal * 0.1) / 1000) * 1000;
  const total = subtotal + serviceFee;
  // 추천 QR 로 들어온 회원이면 귀속을 기록하고 주문에 파트너를 남긴다 (order 라우트와 동일)
  let partnerId: string | null = null; let distributorId: string | null = null;
  if (input.userId) {
    try {
      const refCode = cookies().get(REF_COOKIE)?.value;
      if (refCode) await attributeUser(input.userId, refCode, 'checkout');
      const att = await getAttribution(input.userId);
      if (att) { partnerId = att.partnerId; distributorId = att.distributorId; }
    } catch { /* 귀속 실패가 결제를 막지 않는다 */ }
  }
  const meta = {
    stay: { name: input.name, contact: input.contact, countryCode: input.countryCode, messengerKind: input.messengerKind, messengerId: input.messengerId, checkIn: input.checkIn, nights: 0, arrival: input.arrival, note: input.note },
    listingOrgId: l.ownerOrgId, category: 'travel_package', subType: l.sub, requestedAt: new Date().toISOString(), payToken: makePayToken(),
    contactName: input.name, contactPhone: input.contact, contactMessengerKind: input.messengerKind, contactMessengerId: input.messengerId,
  };
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const [r] = await db.insert(checkoutOrders).values({
        invoiceNo: makeInvoiceNo(), locale: input.locale, listingSlug: input.listingSlug, listingTitle: l.title, interestKey: l.interestKey,
        reserveDate: input.checkIn, reserveYmd: input.checkIn, reserveTime: input.arrival ?? '-', guests: input.guests,
        unitPriceWon: l.priceWon, subtotalWon: subtotal, serviceFeeWon: serviceFee, totalWon: total, paymentMethod: 'toss', status: 'issued',
        userId: input.userId, userEmail: input.userEmail ?? (input.contact.includes('@') ? input.contact : null), partnerId, distributorId,
        meta,
      }).returning({ id: checkoutOrders.id, invoiceNo: checkoutOrders.invoiceNo });
      if (!r) continue;
      await notifyOrderEvent('issued', { invoiceNo: r.invoiceNo, listingTitle: `[${l.sub === 'training' ? '연수' : '패키지'}] ${l.title}`, totalWon: total, guests: input.guests, reserveDate: input.checkIn, reserveTime: input.arrival ?? '-', userEmail: input.userEmail ?? input.contact }).catch(() => false);
      return { ok: true, orderId: r.id, invoiceNo: r.invoiceNo, pay: true, amountWon: total };
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (!/unique|duplicate/i.test(msg)) return { ok: false, error: msg || 'insert_failed' };
    }
  }
  return { ok: false, error: 'invoice_no_collision' };
}

/** 파트너 콘솔: 내 조직 호텔로 들어온 예약 문의·견적 (최근 100건, 최신순). */
export async function listStayRequestsForOrg(orgId: string): Promise<Array<typeof checkoutOrders.$inferSelect>> {
  const slugs = await db.select({ slug: partnerListings.slug }).from(partnerListings).where(and(eq(partnerListings.ownerOrgId, orgId), inArray(partnerListings.category, [...REQUEST_CATEGORIES, 'travel_package'])));
  const list = slugs.map((s) => s.slug).filter((s): s is string => !!s);
  if (list.length === 0) return [];
  const rows = await db.select().from(checkoutOrders)
    .where(and(inArray(checkoutOrders.listingSlug, list), inArray(checkoutOrders.kind, [...REQUEST_KINDS, 'quote'])))
    .orderBy(checkoutOrders.createdAt)
    .limit(100);
  return rows.reverse();
}

/** 파트너(호텔)가 가격을 제안 — 마스터가 보고 그 금액으로 견적을 발행한다. */
export async function proposePartnerPrice(orderId: string, orgId: string, won: number, note: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isFinite(won) || won <= 0) return { ok: false, error: '금액은 1원 이상이어야 합니다' };
  const [o] = await db.select().from(checkoutOrders).where(eq(checkoutOrders.id, orderId)).limit(1);
  if (!o || !isRequestKind(o.kind)) return { ok: false, error: '예약 문의·요청 행이 아닙니다' };
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
  if (!isRequestKind(o.kind) && o.kind !== 'quote') return { ok: false, error: '예약 문의·요청·견적 행이 아닙니다' };
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
      dateYmd: o.reserveYmd, periodLabel: stay && stay.nights > 0 ? `${stay.nights}박` : o.reserveTime, guests: o.guests, invoiceNo: o.invoiceNo,
      link: member ? `${SITE_URL}/${input.locale}/me?invoice=${encodeURIComponent(o.invoiceNo)}` : payLink,
    });
  }
  await notifyOrderEvent('issued', {
    invoiceNo: o.invoiceNo, listingTitle: `[${meta.category === 'hotel' || o.kind === STAY_REQUEST_KIND ? '호텔 견적' : '예약 견적'}] ${o.listingTitle}`, totalWon: amount, guests: o.guests,
    reserveDate: o.reserveDate, reserveTime: o.reserveTime, userEmail: o.userEmail ?? stay?.contact ?? null,
  }).catch(() => false);
  return { ok: true, invoiceNo: o.invoiceNo, payLink, emailSent, member };
}
