/**
 * 총판 귀속 회원의 의료상품 구매 → 병원 수수료(진료과 요율) × 총판
 * 배분율 자동 적립 (실 DB). travel-margin.test.ts 와 같은 골격.
 * 실행: npx vitest run --config vitest.integration.config.ts
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';

process.loadEnvFile?.('.env.local');

const { db } = await import('@/lib/db/client');
const { checkoutOrders } = await import('@/drizzle/schema/checkout-orders');
const { commissionLedger, referralPartners, DEFAULT_DISTRIBUTOR_CONFIG } = await import('@/drizzle/schema/referral-program');
const { partnerListings } = await import('@/drizzle/schema/partner-listings');
const { organizations } = await import('@/drizzle/schema/organizations');
const svc = await import('@/lib/referral/service');

const ids: { partners: string[]; orders: string[]; listings: string[] } = { partners: [], orders: [], listings: [] };
let dist: { id: string };
let hospitalSlug = '';
let hotelSlug = '';

beforeAll(async () => {
  const [d] = await db.insert(referralPartners).values({
    role: 'distributor', code: svc.generateCode('JP'), name: 'TEST-병원수수료총판', countryCode: 'JP', landingLocale: 'ja',
    // feeShare 70% · 성형 30% (DEFAULT_DISTRIBUTOR_CONFIG 그대로)
    config: DEFAULT_DISTRIBUTOR_CONFIG,
  }).returning({ id: referralPartners.id });
  dist = d!; ids.partners.push(d!.id);

  // 의료상품 리스팅 — 운영에 hospital 카테고리가 아직 없어 임시 생성
  const [anyOrg] = await db.select({ id: organizations.id }).from(organizations).limit(1);
  hospitalSlug = 'test-hospital-fee-' + Math.floor(Math.random() * 1e8);
  const [listing] = await db.insert(partnerListings).values({
    ownerOrgId: anyOrg!.id,
    category: 'hospital',
    slug: hospitalSlug,
    title: 'TEST 성형 상담 패키지',
    description: 'TEST',
    status: 'approved',
    priceWon: 3_000_000,
    priceUnit: '회',
    details: { subType: 'plastic_surgery' },
  }).returning({ id: partnerListings.id });
  ids.listings.push(listing!.id);

  const [hotel] = await db.select({ slug: partnerListings.slug }).from(partnerListings)
    .where(eq(partnerListings.category, 'hotel')).limit(1);
  hotelSlug = hotel?.slug ?? 'nonexistent-hotel-slug';
});

afterAll(async () => {
  if (ids.orders.length) {
    await db.delete(commissionLedger).where(inArray(commissionLedger.orderId, ids.orders));
    await db.delete(checkoutOrders).where(inArray(checkoutOrders.id, ids.orders));
  }
  if (ids.listings.length) await db.delete(partnerListings).where(inArray(partnerListings.id, ids.listings));
  if (ids.partners.length) await db.delete(referralPartners).where(inArray(referralPartners.id, ids.partners));
});

async function makeOrder(slug: string, subtotal: number, reserveYmd = '2026-12-01'): Promise<string> {
  const [o] = await db.insert(checkoutOrders).values({
    invoiceNo: 'TEST-' + Math.floor(Math.random() * 1e8), status: 'paid', locale: 'ja',
    listingSlug: slug, listingTitle: 'TEST 상품', reserveDate: '2026-12-01', reserveYmd, reserveTime: '오후 2:00',
    guests: 1, unitPriceWon: subtotal, subtotalWon: subtotal, serviceFeeWon: Math.round(subtotal * 0.1),
    totalWon: subtotal + Math.round(subtotal * 0.1), paymentMethod: 'toss:card',
    partnerId: dist.id, distributorId: dist.id, paidAt: new Date(),
  }).returning({ id: checkoutOrders.id });
  ids.orders.push(o!.id);
  return o!.id;
}

describe('hospital fee accrual on medical product purchase (real DB)', () => {
  it('성형 상품 300만원 구매 → 수수료 풀 90만(30%) → 총판 63만(70%) · 플랫폼 27만', async () => {
    const orderId = await makeOrder(hospitalSlug, 3_000_000);
    const total = await svc.accrueOrderHospitalFee(orderId);
    // 수수료 풀 = 3,000,000 × 30% = 900,000. feeShare 70/30 분배.
    expect(total).toBe(900_000);
    const rows = await db.select().from(commissionLedger)
      .where(and(eq(commissionLedger.orderId, orderId), eq(commissionLedger.basis, 'hospital_fee')));
    const byBeneficiary = Object.fromEntries(rows.map((r) => [r.beneficiary, r.amountWon]));
    expect(byBeneficiary.distributor).toBe(630_000);
    expect(byBeneficiary.platform).toBe(270_000);
    // 확정 시점 = 시술 예약일(KST 자정) + holdDays(14일) → KST 12-15
    const distRow = rows.find((r) => r.beneficiary === 'distributor');
    const kst = distRow?.confirmAt
      ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(distRow.confirmAt)
      : '';
    expect(kst).toBe('2026-12-15');
    // 주문에 수수료 필드가 채워졌다 (마스터 화면 정합)
    const [order] = await db.select({ cat: checkoutOrders.procedureCategory, bp: checkoutOrders.hospitalFeeBp })
      .from(checkoutOrders).where(eq(checkoutOrders.id, orderId));
    expect(order?.cat).toBe('plastic_surgery');
    expect(order?.bp).toBe(3000);
  });

  it('같은 주문 재호출 → 중복 적립 없음 (멱등)', async () => {
    const orderId = await makeOrder(hospitalSlug, 1_000_000);
    expect(await svc.accrueOrderHospitalFee(orderId)).toBe(1_000_000 * 0.3);
    expect(await svc.accrueOrderHospitalFee(orderId)).toBe(0);
  });

  it('의료상품이 아니면(호텔) 적립하지 않는다', async () => {
    const orderId = await makeOrder(hotelSlug, 2_000_000);
    expect(await svc.accrueOrderHospitalFee(orderId)).toBe(0);
  });

  it('총판 귀속이 없으면 적립하지 않는다', async () => {
    const [o] = await db.insert(checkoutOrders).values({
      invoiceNo: 'TEST-' + Math.floor(Math.random() * 1e8), status: 'paid', locale: 'ja',
      listingSlug: hospitalSlug, listingTitle: 'TEST', reserveDate: '2026-12-01', reserveTime: '-',
      guests: 1, unitPriceWon: 1_000_000, subtotalWon: 1_000_000, serviceFeeWon: 0, totalWon: 1_000_000,
      paidAt: new Date(),
    }).returning({ id: checkoutOrders.id });
    ids.orders.push(o!.id);
    expect(await svc.accrueOrderHospitalFee(o!.id)).toBe(0);
  });
});
