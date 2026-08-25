/**
 * 총판·추천인 프로그램 통합 테스트 — 실제 DB(.env.local DATABASE_URL)에
 * 대해 총판 → A → B 체인을 만들고 실적 등록 → 확정 → 정산 → 환수를
 * 끝까지 돌린다. 만든 행은 finally 에서 전부 지운다.
 *
 * 실행: npx vitest run tests/integration/referral-service
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';

process.loadEnvFile?.('.env.local');

const { db } = await import('@/lib/db/client');
const { checkoutOrders } = await import('@/drizzle/schema/checkout-orders');
const { commissionLedger, referralAttributions, referralPartners, DEFAULT_DISTRIBUTOR_CONFIG } = await import('@/drizzle/schema/referral-program');
const svc = await import('@/lib/referral/service');

const FAKE_USER = '11111111-2222-4333-8444-555555555555';
const ids: { partners: string[]; orders: string[] } = { partners: [], orders: [] };
let dist: { id: string; code: string };
let a: { id: string; code: string };
let b: { id: string; code: string };
let tieredOrderId = '';

beforeAll(async () => {
  const [d] = await db.insert(referralPartners).values({
    role: 'distributor', code: svc.generateCode('JP'), name: 'TEST-총판', countryCode: 'JP', landingLocale: 'ja',
    config: { ...DEFAULT_DISTRIBUTOR_CONFIG, feeShare: null }, // 배분표 모드 검증용
  }).returning({ id: referralPartners.id, code: referralPartners.code });
  dist = d!; ids.partners.push(d!.id);
  const [ra] = await db.insert(referralPartners).values({
    role: 'referrer', distributorId: dist.id, parentId: dist.id, code: svc.generateCode('JP'), name: 'TEST-A',
  }).returning({ id: referralPartners.id, code: referralPartners.code });
  a = ra!; ids.partners.push(ra!.id);
  const [rb] = await db.insert(referralPartners).values({
    role: 'referrer', distributorId: dist.id, parentId: a.id, code: svc.generateCode('JP'), name: 'TEST-B',
  }).returning({ id: referralPartners.id, code: referralPartners.code });
  b = rb!; ids.partners.push(rb!.id);
});

afterAll(async () => {
  if (ids.orders.length) {
    await db.delete(commissionLedger).where(inArray(commissionLedger.orderId, ids.orders));
    await db.delete(checkoutOrders).where(inArray(checkoutOrders.id, ids.orders));
  }
  await db.delete(referralAttributions).where(eq(referralAttributions.userId, FAKE_USER));
  if (ids.partners.length) await db.delete(referralPartners).where(inArray(referralPartners.id, ids.partners));
});

describe('referral service (real DB)', () => {
  it('단순 정산 모드 총판: 성형 300만 → 총판 63만 / 플랫폼 27만 (2행)', async () => {
    const [d70] = await db.insert(referralPartners).values({
      role: 'distributor', code: svc.generateCode('JP'), name: 'TEST-70총판', countryCode: 'JP', landingLocale: 'ja',
      config: DEFAULT_DISTRIBUTOR_CONFIG,
    }).returning({ id: referralPartners.id });
    ids.partners.push(d70!.id);
    const r = await svc.createResultOrderWithLedger({
      distributorId: d70!.id, partnerId: d70!.id, kind: 'procedure', category: 'plastic_surgery',
      procedureAmountWon: 3_000_000, saleAmountWon: 0, hospitalFeeBp: null, hospitalName: 'TEST병원',
      listingTitle: 'TEST 70모드', patientUserId: null, patientLabel: 'TEST',
      completedAt: new Date(), reserveDate: '2026-08-24', locale: 'ja',
    });
    ids.orders.push(r.orderId);
    expect(r.rows).toBe(2);
    const rows = await db.select().from(commissionLedger).where(eq(commissionLedger.orderId, r.orderId));
    expect(rows.find((x) => x.beneficiary === 'distributor')?.amountWon).toBe(630_000);
    expect(rows.find((x) => x.beneficiary === 'platform')?.amountWon).toBe(270_000);
  });

  it('체인 해석: B → l1=B, l2=A / A → l1=A, l2=없음 / 총판 → 직접', async () => {
    expect(await svc.resolveChain(b.id)).toEqual({ distributorId: dist.id, l1PartnerId: b.id, l2PartnerId: a.id });
    expect(await svc.resolveChain(a.id)).toEqual({ distributorId: dist.id, l1PartnerId: a.id, l2PartnerId: null });
    expect(await svc.resolveChain(dist.id)).toEqual({ distributorId: dist.id, l1PartnerId: null, l2PartnerId: null });
  });

  it('귀속은 최초 접촉 우선 — 두 번째 코드는 무시된다', async () => {
    const first = await svc.attributeUser(FAKE_USER, b.code, 'test');
    expect(first?.id).toBe(b.id);
    const second = await svc.attributeUser(FAKE_USER, a.code, 'test');
    expect(second?.id).toBe(a.id); // 파트너는 찾지만
    const att = await svc.getAttribution(FAKE_USER);
    expect(att?.partnerId).toBe(b.id); // 귀속은 B 그대로
    const [bRow] = await db.select().from(referralPartners).where(eq(referralPartners.id, b.id));
    expect(bRow?.signups).toBe(1);
  });

  it('실적 등록: B 경유 성형 300만 → 5행, 총 90만, 배분표 일치', async () => {
    const r = await svc.createResultOrderWithLedger({
      distributorId: dist.id, partnerId: b.id, kind: 'procedure', category: 'plastic_surgery',
      procedureAmountWon: 3_000_000, saleAmountWon: 0, hospitalFeeBp: null, hospitalName: 'TEST병원',
      listingTitle: 'TEST 코성형', patientUserId: FAKE_USER, patientLabel: 'TEST 환자',
      completedAt: new Date(Date.now() - 20 * 86_400_000), // 20일 전 → holdDays 14 지남
      reserveDate: '2026-07-01', locale: 'ja',
    });
    ids.orders.push(r.orderId);
    tieredOrderId = r.orderId;
    expect(r.rows).toBe(5);
    expect(r.total).toBe(900_000);
    const rows = await db.select().from(commissionLedger).where(eq(commissionLedger.orderId, r.orderId));
    const by = (k: string): number => rows.filter((x) => x.beneficiary === k).reduce((s, x) => s + x.amountWon, 0);
    expect(by('platform')).toBe(90_000);
    expect(by('patient_points')).toBe(150_000);
    expect(by('referrer_l1')).toBe(420_000);
    expect(by('referrer_l2')).toBe(150_000);
    expect(by('distributor')).toBe(90_000);
    expect(rows.find((x) => x.beneficiary === 'referrer_l1')?.beneficiaryPartnerId).toBe(b.id);
    expect(rows.find((x) => x.beneficiary === 'referrer_l2')?.beneficiaryPartnerId).toBe(a.id);
    expect(rows.every((x) => x.status === 'pending')).toBe(true);
  });

  it('여행상품: 총판 직접, 판매가 300만 + 포함 성형 200만 → 마진 30만 + 54만', async () => {
    const r = await svc.createResultOrderWithLedger({
      distributorId: dist.id, partnerId: dist.id, kind: 'travel', category: 'plastic_surgery',
      procedureAmountWon: 2_000_000, saleAmountWon: 3_000_000, hospitalFeeBp: null, hospitalName: null,
      listingTitle: 'TEST K-뷰티 투어', patientUserId: null, patientLabel: 'TEST 관광객',
      completedAt: new Date(), reserveDate: '2026-08-01', locale: 'ja',
    });
    ids.orders.push(r.orderId);
    const t = await svc.partnerTotals(dist.id);
    // 앞 테스트의 총판 몫 9만 + 이번 84만 = 93만 (모두 pending)
    expect(t.pending).toBe(930_000);
  });

  it('확정 → 정산(지급) → 환수', async () => {
    const confirmed = await svc.confirmDueLedger(dist.id);
    expect(confirmed).toBe(5); // 20일 전 완료 건만 (여행 건은 오늘 완료라 아직 대기)
    const settled = await svc.markSettled(dist.id, '2026-07');
    expect(settled.rows).toBe(3); // l1, l2, 총판 — 운영비·포인트 제외
    expect(settled.amount).toBe(660_000);
    expect((await svc.partnerTotals(b.id)).paid).toBe(420_000);
    expect((await svc.patientPointsBalance(FAKE_USER))).toBe(150_000);

    const reversed = await svc.reverseOrder(tieredOrderId, 'TEST 환불');
    expect(reversed).toBe(5);
    const rows = await db.select().from(commissionLedger).where(eq(commissionLedger.orderId, tieredOrderId));
    // 지급된 3행은 음수 환수 행이 추가되고, 미지급 2행(운영비·포인트)은 reversed
    expect(rows.filter((x) => x.amountWon < 0)).toHaveLength(3);
    expect(rows.filter((x) => x.status === 'reversed')).toHaveLength(2);
    const bAfter = await svc.partnerTotals(b.id);
    expect(bAfter.paid + bAfter.confirmed).toBe(0); // 42만 − 42만
  });
});
