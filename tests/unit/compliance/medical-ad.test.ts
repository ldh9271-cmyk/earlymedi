import { describe, it, expect } from 'vitest';
import { checkAdCopy, getCountryGuidelines } from '@/lib/compliance/medical-ad-rules';
import {
  ageBandFromBirthYear,
  buildKoihaCsv,
  quarterCode,
  quarterRange,
  summarizeKoiha,
  type KoihaRow,
} from '@/lib/compliance/koiha-csv';

describe('medical-ad-rules', () => {
  it('flags absolute claim "100% 안전"', () => {
    const r = checkAdCopy('우리 시술은 100% 안전합니다');
    expect(r.some((v) => v.code === 'guarantee_effect')).toBe(true);
    expect(r[0]?.severity).toBe('critical');
  });

  it('flags comparative "국내 1위"', () => {
    const r = checkAdCopy('국내 1위 성형외과');
    expect(r.some((v) => v.code === 'comparative')).toBe(true);
  });

  it('flags 후기 단정 표현', () => {
    const r = checkAdCopy('환자 후기 99% 만족도');
    expect(r.some((v) => v.code === 'review_as_certainty')).toBe(true);
  });

  it('flags 할인 조건 미명시', () => {
    const r = checkAdCopy('지금 50% 할인!');
    expect(r.some((v) => v.code === 'price_discount_no_terms')).toBe(true);
  });

  it('passes when terms are present with discount', () => {
    const r = checkAdCopy('이번 달 한정 30% 할인 (대상: 신규 환자, 기간: 2026-06-01~30)');
    expect(r.some((v) => v.code === 'price_discount_no_terms')).toBe(false);
  });

  it('flags surgery ad missing risk disclosure', () => {
    const r = checkAdCopy('코재수술 전문 — 자연스러운 라인');
    expect(r.some((v) => v.code === 'risk_omission')).toBe(true);
  });

  it('passes clean compliant copy', () => {
    const r = checkAdCopy('코재수술 전문. 부작용·회복기간은 의사 상담 시 안내드립니다.');
    expect(r.length).toBe(0);
  });

  it('returns country guidelines for known codes', () => {
    expect(getCountryGuidelines('CN')?.notes.length).toBeGreaterThan(0);
    expect(getCountryGuidelines('JP')?.notes.length).toBeGreaterThan(0);
    expect(getCountryGuidelines('US')?.notes.length).toBeGreaterThan(0);
  });

  it('returns null for unknown country', () => {
    expect(getCountryGuidelines('XX')).toBeNull();
  });
});

describe('koiha-csv', () => {
  it('quarter range Q2 2026 = Apr 1 — Jun 30', () => {
    const r = quarterRange({ year: 2026, quarter: 2 });
    expect(r).toEqual({ start: '2026-04-01', end: '2026-06-30' });
  });

  it('quarter code formats correctly', () => {
    expect(quarterCode({ year: 2026, quarter: 3 })).toBe('2026Q3');
  });

  it('age band buckets correctly', () => {
    expect(ageBandFromBirthYear(2005, 2026)).toBe('20_29');
    expect(ageBandFromBirthYear(1990, 2026)).toBe('30_39');
    expect(ageBandFromBirthYear(1960, 2026)).toBe('60_plus');
  });

  it('CSV has header + escaped cells', () => {
    const rows: KoihaRow[] = [
      {
        patientNationality: 'CHN',
        sex: 'female',
        ageBand: '30_39',
        procedureCategory: 'plastic_surgery',
        entryDate: '2026-06-10',
        exitDate: '2026-06-20',
        grossRevenueKrw: 11_000_000,
        patientPaidBp: 10_000,
        insuranceCovered: false,
      },
    ];
    const csv = buildKoihaCsv({ year: 2026, quarter: 2 }, rows);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('분기');
    expect(lines[1]).toContain('2026Q2');
    expect(lines[1]).toContain('CHN');
    expect(lines[1]).toContain('11000000');
    expect(lines[1]).toContain('N');
  });

  it('summarize aggregates by nationality and category', () => {
    const rows: KoihaRow[] = [
      { patientNationality: 'CHN', sex: 'female', ageBand: '30_39', procedureCategory: 'plastic_surgery', entryDate: '2026-04-01', exitDate: '2026-04-08', grossRevenueKrw: 10_000_000, patientPaidBp: 10_000, insuranceCovered: false },
      { patientNationality: 'CHN', sex: 'male', ageBand: '40_49', procedureCategory: 'dental', entryDate: '2026-04-02', exitDate: '2026-04-05', grossRevenueKrw: 5_000_000, patientPaidBp: 10_000, insuranceCovered: false },
      { patientNationality: 'JPN', sex: 'female', ageBand: '20_29', procedureCategory: 'plastic_surgery', entryDate: '2026-04-05', exitDate: '2026-04-10', grossRevenueKrw: 8_000_000, patientPaidBp: 10_000, insuranceCovered: false },
    ];
    const s = summarizeKoiha(rows);
    expect(s.totalPatients).toBe(3);
    expect(s.totalRevenueKrw).toBe(23_000_000);
    expect(s.byNationality[0]).toMatchObject({ code: 'CHN', count: 2 });
    expect(s.byCategory[0]).toMatchObject({ category: 'plastic_surgery', count: 2 });
  });
});
