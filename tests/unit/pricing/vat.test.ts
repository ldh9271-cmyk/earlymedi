import { describe, it, expect } from 'vitest';
import { computeLineVat, summarizeVat } from '@/lib/pricing/vat-calculator';

describe('vat-calculator', () => {
  it('inclusive 10% extracts VAT from gross', () => {
    const r = computeLineVat({
      lineTotalKrw: 11_000_000,
      vatTreatment: 'taxable',
      vatIncluded: true,
    });
    expect(r.netKrw).toBe(10_000_000);
    expect(r.vatKrw).toBe(1_000_000);
    expect(r.grossKrw).toBe(11_000_000);
  });

  it('exclusive 10% adds VAT on top', () => {
    const r = computeLineVat({
      lineTotalKrw: 10_000_000,
      vatTreatment: 'taxable',
      vatIncluded: false,
    });
    expect(r.netKrw).toBe(10_000_000);
    expect(r.vatKrw).toBe(1_000_000);
    expect(r.grossKrw).toBe(11_000_000);
  });

  it('exempt lines have zero VAT regardless of mode', () => {
    const r = computeLineVat({
      lineTotalKrw: 500_000,
      vatTreatment: 'exempt',
      vatIncluded: true,
    });
    expect(r.vatKrw).toBe(0);
    expect(r.netKrw).toBe(500_000);
    expect(r.grossKrw).toBe(500_000);
  });

  it('summarizes mixed chart correctly', () => {
    const s = summarizeVat([
      { lineTotalKrw: 11_000_000, vatTreatment: 'taxable', vatIncluded: true }, // 코수술
      { lineTotalKrw: 200_000, vatTreatment: 'exempt', vatIncluded: false }, // 검진
    ]);
    expect(s.netTotalKrw).toBe(10_200_000);
    expect(s.vatTotalKrw).toBe(1_000_000);
    expect(s.grossTotalKrw).toBe(11_200_000);
    expect(s.exemptNetKrw).toBe(200_000);
    expect(s.taxableNetKrw).toBe(10_000_000);
  });
});
