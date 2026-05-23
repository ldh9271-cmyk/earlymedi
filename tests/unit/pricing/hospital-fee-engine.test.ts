import { describe, it, expect } from 'vitest';
import {
  computeHospitalFee,
  STANDARD_CATEGORY_RATES_BP,
  type HospitalFeePolicy,
  type ChartLine,
} from '@/lib/pricing/hospital-fee-engine';

const RHINO_LINE: ChartLine = {
  procedureCode: 'rhino-revision',
  procedureCategory: 'plastic_surgery',
  lineTotalKrw: 11_000_000,
  vatTreatment: 'taxable',
  vatIncluded: true,
  vatRateBp: 1_000,
};

const BASE_POLICY: HospitalFeePolicy = {
  defaultRateBp: 1_000, // 10%
  perCategoryBp: STANDARD_CATEGORY_RATES_BP,
  feeBase: 'net_excl_vat',
  includeDepositInBase: true,
  includePatientDirectPay: false,
  packageRule: 'sum_per_item',
};

describe('hospital-fee-engine', () => {
  it('spec example: 코수술 ₩11M (VAT incl) at 30% net-of-VAT yields ₩3M', () => {
    const r = computeHospitalFee([RHINO_LINE], BASE_POLICY);
    expect(r.baseTotalKrw).toBe(10_000_000); // net of 10% VAT
    expect(r.lines[0]?.appliedRateBp).toBe(3_000); // category override
    expect(r.totalFeeKrw).toBe(3_000_000);
  });

  it('falls back to default rate when no category match', () => {
    const r = computeHospitalFee(
      [
        {
          procedureCode: 'unknown',
          procedureCategory: 'unmapped',
          lineTotalKrw: 1_000_000,
          vatTreatment: 'taxable',
          vatIncluded: false,
        },
      ],
      BASE_POLICY,
    );
    expect(r.lines[0]?.source).toBe('default');
    expect(r.lines[0]?.appliedRateBp).toBe(1_000);
    expect(r.totalFeeKrw).toBe(100_000);
  });

  it('per-procedure override beats category', () => {
    const r = computeHospitalFee([RHINO_LINE], {
      ...BASE_POLICY,
      perProcedureBp: { 'rhino-revision': 2_500 },
    });
    expect(r.lines[0]?.source).toBe('procedure');
    expect(r.lines[0]?.appliedRateBp).toBe(2_500);
    expect(r.totalFeeKrw).toBe(2_500_000);
  });

  it('exempt lines contribute base but no VAT carve-out', () => {
    const r = computeHospitalFee(
      [
        {
          procedureCode: 'exam',
          procedureCategory: 'checkup',
          lineTotalKrw: 500_000,
          vatTreatment: 'exempt',
          vatIncluded: false,
        },
      ],
      BASE_POLICY,
    );
    expect(r.lines[0]?.baseKrw).toBe(500_000);
    expect(r.totalFeeKrw).toBe(50_000); // 10% checkup
  });

  it('applies VIP boost on top of base', () => {
    const r = computeHospitalFee([RHINO_LINE], { ...BASE_POLICY, vipBoostBp: 500 }, { isVip: true });
    expect(r.vipBoostKrw).toBe(150_000); // 5% of 3M
    expect(r.totalFeeKrw).toBe(3_150_000);
  });

  it('applies min-guaranteed floor', () => {
    const r = computeHospitalFee(
      [
        {
          procedureCode: 'minor',
          procedureCategory: 'checkup',
          lineTotalKrw: 100_000,
          vatTreatment: 'taxable',
          vatIncluded: false,
        },
      ],
      { ...BASE_POLICY, minGuaranteedKrw: 50_000 },
    );
    expect(r.totalFeeKrw).toBe(50_000);
    expect(r.minGuaranteeAppliedKrw).toBe(40_000);
  });

  it('progressive tier boosts effective rate when monthly volume crosses threshold', () => {
    const r = computeHospitalFee(
      [RHINO_LINE],
      {
        ...BASE_POLICY,
        progressive: [{ minPatientsPerMonth: 10, rateBp: 3_500 }],
      },
      { monthlyVolumeForHospital: 12 },
    );
    // delta = 3500 - 1000 default = 2500bp applied to 10M base = 2,500,000
    expect(r.progressiveBoostKrw).toBe(2_500_000);
  });
});
