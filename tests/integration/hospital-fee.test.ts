/**
 * 의료상품 병원 수수료 2단계 정산 (실 DB).
 *
 *  1단계 stampOrderHospitalFee   — 플랫폼 결제(paid) 시 진료과·요율만 스탬프.
 *                                  원장 생성 없음 (플랫폼 결제액 ≠ 정산 기준).
 *  2단계 settleOrderHospitalFeeActual — 병원 실결제액 입력 시 원장 생성.
 *                                  재입력 = 기존 행 환수/무효 후 재정산.
 *
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

async function ledgerRows(orderId: string) {
  return db.select().from(commissionLedger)
    .where(and(eq(commissionLedger.orderId, orderId), eq(commissionLedger.basis, 'hospital_fee')));
}

describe('hospital fee two-phase settlement (real DB)', () => {
  it('결제 시점: 진료과·요율만 스탬프, 원장 없음 (플랫폼 결제액은 기준 아님)', async () => {
    const orderId = await makeOrder(hospitalSlug, 3_000_000);
    expect(await svc.stampOrderHospitalFee(orderId)).toBe(true);
    expect(await svc.stampOrderHospitalFee(orderId)).toBe(true); // 멱등

    expect(await ledgerRows(orderId)).toHaveLength(0);
    const [order] = await db.select().from(checkoutOrders).where(eq(checkoutOrders.id, orderId));
    expect(order?.procedureCategory).toBe('plastic_surgery');
    expect(order?.hospitalFeeBp).toBe(3000);
    expect((order?.meta as Record<string, unknown>)?.hospitalFeeAwaitingActual).toBe(true);
  });

  it('실결제 500만 확정 → 풀 150만(30%) → 총판 105만(70%) · 플랫폼 45만, 확정=시술일+14일', async () => {
    const orderId = await makeOrder(hospitalSlug, 3_000_000);
    await svc.stampOrderHospitalFee(orderId);

    const { total } = await svc.settleOrderHospitalFeeActual({
      orderId, actualAmountWon: 5_000_000, procedureYmd: '2026-12-01',
    });
    expect(total).toBe(1_500_000);

    const rows = await ledgerRows(orderId);
    const byBeneficiary = Object.fromEntries(rows.map((r) => [r.beneficiary, r.amountWon]));
    expect(byBeneficiary.distributor).toBe(1_050_000);
    expect(byBeneficiary.platform).toBe(450_000);
    // 기준액이 병원 실결제액이다
    expect(rows.every((r) => r.baseAmountWon === 5_000_000)).toBe(true);
    // 확정 시점 = 시술일(KST) + holdDays(14일) → KST 12-15
    const distRow = rows.find((r) => r.beneficiary === 'distributor');
    const kst = distRow?.confirmAt
      ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(distRow.confirmAt)
      : '';
    expect(kst).toBe('2026-12-15');

    const [order] = await db.select().from(checkoutOrders).where(eq(checkoutOrders.id, orderId));
    expect(order?.procedureAmountWon).toBe(5_000_000);
    expect((order?.meta as Record<string, unknown>)?.hospitalFeeAwaitingActual).toBe(false);
  });

  it('금액 정정 재정산 → 기존 행 reversed, 새 금액으로 대체 (유효 합계 = 새 금액 기준)', async () => {
    const orderId = await makeOrder(hospitalSlug, 3_000_000);
    await svc.stampOrderHospitalFee(orderId);
    await svc.settleOrderHospitalFeeActual({ orderId, actualAmountWon: 5_000_000, procedureYmd: '2026-12-01' });
    await svc.settleOrderHospitalFeeActual({ orderId, actualAmountWon: 4_000_000, procedureYmd: '2026-12-01' });

    const rows = await ledgerRows(orderId);
    const activeSum = rows.filter((r) => r.status !== 'reversed').reduce((a, r) => a + r.amountWon, 0);
    expect(activeSum).toBe(1_200_000); // 400만 × 30%
    expect(rows.filter((r) => r.status === 'reversed')).toHaveLength(2); // 이전 500만 분배 2행
    const [order] = await db.select().from(checkoutOrders).where(eq(checkoutOrders.id, orderId));
    expect(order?.procedureAmountWon).toBe(4_000_000);
  });

  it('스탬프 없이도(구주문) 리스팅으로 진료과를 판별해 정산된다', async () => {
    const orderId = await makeOrder(hospitalSlug, 2_000_000);
    const { total } = await svc.settleOrderHospitalFeeActual({ orderId, actualAmountWon: 2_000_000 });
    expect(total).toBe(600_000);
  });

  it('의료상품이 아니면(호텔) 스탬프도 정산도 거부', async () => {
    const orderId = await makeOrder(hotelSlug, 2_000_000);
    expect(await svc.stampOrderHospitalFee(orderId)).toBe(false);
    await expect(
      svc.settleOrderHospitalFeeActual({ orderId, actualAmountWon: 1_000_000 }),
    ).rejects.toThrow('의료상품');
  });

  it('총판 귀속이 없으면 스탬프하지 않는다', async () => {
    const [o] = await db.insert(checkoutOrders).values({
      invoiceNo: 'TEST-' + Math.floor(Math.random() * 1e8), status: 'paid', locale: 'ja',
      listingSlug: hospitalSlug, listingTitle: 'TEST', reserveDate: '2026-12-01', reserveTime: '-',
      guests: 1, unitPriceWon: 1_000_000, subtotalWon: 1_000_000, serviceFeeWon: 0, totalWon: 1_000_000,
      paidAt: new Date(),
    }).returning({ id: checkoutOrders.id });
    ids.orders.push(o!.id);
    expect(await svc.stampOrderHospitalFee(o!.id)).toBe(false);
  });
});
