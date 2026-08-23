import { describe, expect, it } from 'vitest';
import { computeLedger, DEFAULT_DISTRIBUTOR_CONFIG } from '@/lib/referral/commission';

const D = 'dist-1';
const base = {
  distributorId: D,
  patientUserId: 'user-1',
  config: DEFAULT_DISTRIBUTOR_CONFIG,
  hospitalFeeBp: null,
  saleAmountWon: 0,
};

function sum(rows: ReturnType<typeof computeLedger>, who?: string): number {
  return rows.filter((r) => !who || r.beneficiary === who).reduce((a, r) => a + r.amountWon, 0);
}

describe('computeLedger — 제안서 배분표', () => {
  it('총판 직접 유치 · 성형 300만원 → 운영비 9만, 총판 81만', () => {
    const rows = computeLedger({ ...base, kind: 'procedure', category: 'plastic_surgery', procedureAmountWon: 3_000_000, l1PartnerId: null, l2PartnerId: null });
    expect(sum(rows, 'platform')).toBe(90_000);
    expect(sum(rows, 'distributor')).toBe(810_000);
    expect(sum(rows, 'patient_points')).toBe(0);
    expect(sum(rows)).toBe(900_000);
  });

  it('총판 직접 유치 · 피부 300만원 → 총판 51만', () => {
    const rows = computeLedger({ ...base, kind: 'procedure', category: 'dermatology', procedureAmountWon: 3_000_000, l1PartnerId: null, l2PartnerId: null });
    expect(sum(rows, 'distributor')).toBe(510_000);
    expect(sum(rows)).toBe(600_000);
  });

  it('추천인 B 경유 (A 가 모집) · 성형 → 포인트 15만 / B 42만 / A 15만 / 총판 9만', () => {
    const rows = computeLedger({ ...base, kind: 'procedure', category: 'plastic_surgery', procedureAmountWon: 3_000_000, l1PartnerId: 'B', l2PartnerId: 'A' });
    expect(sum(rows, 'platform')).toBe(90_000);
    expect(sum(rows, 'patient_points')).toBe(150_000);
    expect(sum(rows, 'referrer_l1')).toBe(420_000);
    expect(sum(rows, 'referrer_l2')).toBe(150_000);
    expect(sum(rows, 'distributor')).toBe(90_000);
    expect(sum(rows)).toBe(900_000);
    expect(rows.find((r) => r.beneficiary === 'referrer_l1')?.beneficiaryPartnerId).toBe('B');
    expect(rows.find((r) => r.beneficiary === 'patient_points')?.beneficiaryUserId).toBe('user-1');
  });

  it('추천인 A 경유 (총판이 모집, 2단계 없음) · 피부 → 빈 2단계 몫이 총판으로 (총판 15만 = 3%+2%)', () => {
    const rows = computeLedger({ ...base, kind: 'procedure', category: 'dermatology', procedureAmountWon: 3_000_000, l1PartnerId: 'A', l2PartnerId: null });
    expect(sum(rows, 'referrer_l1')).toBe(270_000);
    expect(sum(rows, 'referrer_l2')).toBe(0);
    expect(sum(rows, 'distributor')).toBe(150_000);
    expect(sum(rows)).toBe(600_000);
  });

  it('여행상품 · 판매가 300만 + 포함 성형 200만 (총판 직접) → 마진 30만 + 54만', () => {
    const rows = computeLedger({ ...base, kind: 'travel', category: 'plastic_surgery', saleAmountWon: 3_000_000, procedureAmountWon: 2_000_000, l1PartnerId: null, l2PartnerId: null });
    const margin = rows.find((r) => r.basis === 'travel_margin');
    expect(margin?.amountWon).toBe(300_000);
    expect(margin?.beneficiary).toBe('distributor');
    expect(rows.filter((r) => r.basis === 'hospital_fee' && r.beneficiary === 'distributor')[0]?.amountWon).toBe(540_000);
    expect(sum(rows, 'distributor')).toBe(840_000);
  });

  it('병원 수수료율 스냅샷이 배분표 합보다 작아도 음수가 나지 않는다 (25% 성형 → 총판 잔여 0)', () => {
    const rows = computeLedger({ ...base, kind: 'procedure', category: 'plastic_surgery', procedureAmountWon: 1_000_000, hospitalFeeBp: 2500, l1PartnerId: 'B', l2PartnerId: 'A' });
    expect(sum(rows)).toBe(250_000);
    expect(rows.every((r) => r.amountWon >= 0)).toBe(true);
  });

  it('시술비 0 인 여행상품은 마진 행만 생긴다', () => {
    const rows = computeLedger({ ...base, kind: 'travel', category: null, saleAmountWon: 750_000, procedureAmountWon: 0, l1PartnerId: null, l2PartnerId: null });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.amountWon).toBe(75_000);
  });
});
