import { describe, it, expect } from 'vitest';
import {
  computeCommission,
  splitCommissionPool,
  type CommissionPolicy,
} from '@/lib/pricing/commission-engine';
import {
  resolveCommissionPolicy,
  snapshotPolicy,
} from '@/lib/pricing/policy-resolver';

const CTX = {
  patientPaidKrw: 11_000_000,
  hospitalQuoteKrw: 10_000_000,
  hospitalReferralFeeKrw: 3_000_000,
  agencyCostsKrw: 200_000,
};

describe('commission-engine', () => {
  it('30% of hospital referral fee with KR resident withholding', () => {
    const policy: CommissionPolicy = {
      calcType: 'percent_of_revenue',
      base: 'hospital_referral_fee',
      rateBp: 3_000,
      vatTreatment: 'exclusive',
      withholdingTaxBp: 330,
    };
    const r = computeCommission(policy, CTX);
    expect(r.baseKrw).toBe(3_000_000);
    expect(r.grossKrw).toBe(900_000);
    expect(r.withholdingKrw).toBe(29_700); // 3.30%
    expect(r.netPayableKrw).toBe(870_300);
  });

  it('fixed amount ignores rate', () => {
    const policy: CommissionPolicy = {
      calcType: 'fixed_amount',
      base: 'hospital_referral_fee',
      fixedAmountKrw: 500_000,
      vatTreatment: 'not_applicable',
      withholdingTaxBp: 0,
    };
    const r = computeCommission(policy, CTX);
    expect(r.grossKrw).toBe(500_000);
    expect(r.appliedRateBp).toBe(0);
  });

  it('tiered rate picks highest threshold satisfied', () => {
    const policy: CommissionPolicy = {
      calcType: 'tiered',
      base: 'hospital_referral_fee',
      tiers: [
        { minThreshold: 0, rateBp: 2_000 },
        { minThreshold: 5, rateBp: 2_500 },
        { minThreshold: 20, rateBp: 3_500 },
      ],
      vatTreatment: 'exclusive',
      withholdingTaxBp: 0,
    };
    const r = computeCommission(policy, { ...CTX, monthlyVolumeMetric: 8 });
    expect(r.appliedRateBp).toBe(2_500);
    expect(r.grossKrw).toBe(750_000);
  });

  it('cancellation penalty applies', () => {
    const policy: CommissionPolicy = {
      calcType: 'percent_of_revenue',
      base: 'hospital_referral_fee',
      rateBp: 3_000,
      vatTreatment: 'exclusive',
      withholdingTaxBp: 0,
      cancellationPenaltyBp: 5_000, // 50% penalty
    };
    const r = computeCommission(policy, { ...CTX, isCancelled: true });
    expect(r.grossKrw).toBe(900_000);
    expect(r.penaltyKrw).toBe(450_000);
    expect(r.netPayableKrw).toBe(450_000);
  });

  it('net_margin base = referral fee minus costs', () => {
    const policy: CommissionPolicy = {
      calcType: 'percent_of_margin',
      base: 'net_margin',
      rateBp: 5_000, // 50%
      vatTreatment: 'exclusive',
      withholdingTaxBp: 0,
    };
    const r = computeCommission(policy, CTX);
    expect(r.baseKrw).toBe(2_800_000); // 3M - 200k
    expect(r.grossKrw).toBe(1_400_000);
  });
});

describe('splitCommissionPool', () => {
  it('splits 70/30 deterministically with rounding spill to top share', () => {
    const out = splitCommissionPool(1_000_001, [
      { payeeId: 'A', shareBp: 7_000 },
      { payeeId: 'B', shareBp: 3_000 },
    ]);
    expect(out[0]?.amountKrw).toBe(700_001); // A is top, absorbs spill
    expect(out[1]?.amountKrw).toBe(300_000);
    expect(out[0]!.amountKrw + out[1]!.amountKrw).toBe(1_000_001);
  });

  it('zero pool → zero payouts', () => {
    const out = splitCommissionPool(0, [{ payeeId: 'A', shareBp: 10_000 }]);
    expect(out[0]?.amountKrw).toBe(0);
  });
});

describe('policy-resolver', () => {
  it('case override beats everything', () => {
    const r = resolveCommissionPolicy({
      case: { label: 'case' },
      individual: { label: 'individual' },
      category: { label: 'category' },
      organization: { label: 'org' },
    });
    expect(r.level).toBe('case');
    expect(r.policy.label).toBe('case');
  });

  it('falls through to organization default', () => {
    const r = resolveCommissionPolicy({ organization: { label: 'org' } });
    expect(r.level).toBe('organization');
  });

  it('snapshot freezes ISO timestamp', () => {
    const snap = snapshotPolicy({ policy: { foo: 'bar' }, level: 'case' });
    expect(snap.snapshotAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(snap.policy.foo).toBe('bar');
  });
});
