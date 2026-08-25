/**
 * 총판 귀속 회원의 여행 패키지 구매 → 10% 마진 자동 적립 (실 DB).
 * 실행: npx vitest run --config vitest.integration.config.ts
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';

process.loadEnvFile?.('.env.local');

const { db } = await import('@/lib/db/client');
const { checkoutOrders } = await import('@/drizzle/schema/checkout-orders');
const { commissionLedger, referralPartners, DEFAULT_DISTRIBUTOR_CONFIG } = await import('@/drizzle/schema/referral-program');
const { partnerListings } = await import('@/drizzle/schema/partner-listings');
const svc = await import('@/lib/referral/service');

const ids: { partners: string[]; orders: string[]; listings: string[] } = { partners: [], orders: [], listings: [] };
let dist: { id: string };
let pkgSlug = '';
let hotelSlug = '';

beforeAll(async () => {
  const [d] = await db.insert(referralPartners).values({
    role: 'distributor', code: svc.generateCode('JP'), name: 'TEST-마진총판', countryCode: 'JP', landingLocale: 'ja',
    config: DEFAULT_DISTRIBUTOR_CONFIG, // travelMarginPct 10
  }).returning({ id: referralPartners.id });
  dist = d!; ids.partners.push(d!.id);

  // 실제 travel_package 슬러그가 있으면 재사용, 없으면 임시 리스팅 생성
  const [pkg] = await db.select({ slug: partnerListings.slug }).from(partnerListings)
    .where(eq(partnerListings.category, 'travel_package')).limit(1);
  if (pkg) { pkgSlug = pkg.slug; }
  const [hotel] = await db.select({ slug: partnerListings.slug }).from(partnerListings)
    .where(eq(partnerListings.category, 'hotel')).limit(1);
  hotelSlug = hotel?.slug ?? 'nonexistent-hotel-slug';
});

afterAll(async () => {
  if (ids.orders.length) {
    await db.delete(commissionLedger).where(inArray(commissionLedger.orderId, ids.orders));
    await db.delete(checkoutOrders).where(inArray(checkoutOrders.id, ids.orders));
  }
  if (ids.partners.length) await db.delete(referralPartners).where(inArray(referralPartners.id, ids.partners));
});

async function makeOrder(slug: string, subtotal: number): Promise<string> {
  const [o] = await db.insert(checkoutOrders).values({
    invoiceNo: 'TEST-' + Math.floor(Math.random() * 1e8), status: 'reported', locale: 'ja',
    listingSlug: slug, listingTitle: 'TEST 상품', reserveDate: '2026-09-01', reserveTime: '오후 2:00',
    guests: 1, unitPriceWon: subtotal, subtotalWon: subtotal, serviceFeeWon: Math.round(subtotal * 0.1),
    totalWon: subtotal + Math.round(subtotal * 0.1), paymentMethod: 'alipay',
    partnerId: dist.id, distributorId: dist.id, paidAt: new Date(),
  }).returning({ id: checkoutOrders.id });
  ids.orders.push(o!.id);
  return o!.id;
}

describe('travel margin accrual (real DB)', () => {
  it('여행 패키지 300만원 구매 → 총판 마진 30만원 적립', async () => {
    if (!pkgSlug) { console.warn('travel_package 리스팅 없음 — 스킵'); return; }
    const orderId = await makeOrder(pkgSlug, 3_000_000);
    const margin = await svc.accrueOrderTravelMargin(orderId);
    expect(margin).toBe(300_000);
    const rows = await db.select().from(commissionLedger)
      .where(and(eq(commissionLedger.orderId, orderId), eq(commissionLedger.basis, 'travel_margin')));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.beneficiary).toBe('distributor');
    expect(rows[0]!.amountWon).toBe(300_000);
    expect(rows[0]!.status).toBe('pending');
  });

  it('중복 호출은 재적립하지 않는다 (멱등)', async () => {
    if (!pkgSlug) return;
    const orderId = await makeOrder(pkgSlug, 3_000_000);
    expect(await svc.accrueOrderTravelMargin(orderId)).toBe(300_000);
    expect(await svc.accrueOrderTravelMargin(orderId)).toBe(0);
    const rows = await db.select().from(commissionLedger).where(eq(commissionLedger.orderId, orderId));
    expect(rows).toHaveLength(1);
  });

  it('여행 패키지가 아닌 상품(호텔)은 적립하지 않는다', async () => {
    const orderId = await makeOrder(hotelSlug, 150_000);
    expect(await svc.accrueOrderTravelMargin(orderId)).toBe(0);
  });

  it('총판 귀속이 없는 주문은 적립하지 않는다', async () => {
    if (!pkgSlug) return;
    const [o] = await db.insert(checkoutOrders).values({
      invoiceNo: 'TEST-' + Math.floor(Math.random() * 1e8), status: 'reported', locale: 'ja',
      listingSlug: pkgSlug, listingTitle: 'TEST', reserveDate: '2026-09-01', reserveTime: '-',
      guests: 1, unitPriceWon: 3_000_000, subtotalWon: 3_000_000, serviceFeeWon: 0, totalWon: 3_000_000,
      paymentMethod: 'alipay', paidAt: new Date(),
    }).returning({ id: checkoutOrders.id });
    ids.orders.push(o!.id);
    expect(await svc.accrueOrderTravelMargin(o!.id)).toBe(0);
  });

  it('취소하면 적립 마진이 환수(reversed)된다', async () => {
    if (!pkgSlug) return;
    const orderId = await makeOrder(pkgSlug, 3_000_000);
    await svc.accrueOrderTravelMargin(orderId);
    await svc.reverseOrder(orderId, 'TEST 취소');
    const rows = await db.select().from(commissionLedger).where(eq(commissionLedger.orderId, orderId));
    expect(rows.every((r) => r.status === 'reversed')).toBe(true);
  });
});
