import { describe, it, expect } from 'vitest';
import {
  STANDARD_REFUND_TIERS,
  STANDARD_CANCELLATION_SPLIT,
  type DepositPolicy,
} from '@/lib/pricing/deposit-engine';
import { computeRefund } from '@/lib/pricing/deposit-refund-calculator';

const POLICY: DepositPolicy = {
  isEnabled: true,
  percentageBp: 2_000,
  collector: 'agency_collects',
  timing: 'on_quote_accepted',
  refundTiers: [...STANDARD_REFUND_TIERS],
  medicalCauseFullRefund: true,
  forceMajeureFullRefund: true,
  includeInReferralBase: false,
  cancellationSplit: STANDARD_CANCELLATION_SPLIT,
};

describe('deposit-refund-calculator', () => {
  it('D-31 patient cancel → 100% refund (top tier)', () => {
    const r = computeRefund({ reason: 'patient_cancel', daysToVisit: 31, depositKrw: 1_000_000, policy: POLICY });
    expect(r.patientRefundKrw).toBe(1_000_000);
    expect(r.hospitalForfeitKrw).toBe(0);
    expect(r.agencyForfeitKrw).toBe(0);
    expect(r.appliedTier?.refundBp).toBe(10_000);
  });

  it('D-15 patient cancel → 70% refund, 30% forfeit split 60/40', () => {
    const r = computeRefund({ reason: 'patient_cancel', daysToVisit: 15, depositKrw: 1_000_000, policy: POLICY });
    expect(r.appliedTier?.refundBp).toBe(7_000);
    // 700,000 base refund; 300,000 forfeit split 180k/120k/0
    expect(r.patientRefundKrw).toBe(700_000);
    expect(r.hospitalForfeitKrw).toBe(180_000);
    expect(r.agencyForfeitKrw).toBe(120_000);
  });

  it('D-5 patient cancel → 0% refund (D-7 tier 50%, D-3 tier 0%, but actual is between → D-3 yields 0)', () => {
    // 5 days < 7, so the highest threshold ≤ 5 is the D-3 tier (refund 0%).
    const r = computeRefund({ reason: 'patient_cancel', daysToVisit: 5, depositKrw: 1_000_000, policy: POLICY });
    expect(r.appliedTier?.minDaysToVisit).toBe(3);
    expect(r.appliedTier?.refundBp).toBe(0);
    expect(r.patientRefundKrw).toBe(0);
    expect(r.hospitalForfeitKrw).toBe(600_000);
    expect(r.agencyForfeitKrw).toBe(400_000);
  });

  it('medical cause → full refund overrides tiers', () => {
    const r = computeRefund({ reason: 'medical_cause', daysToVisit: 1, depositKrw: 1_000_000, policy: POLICY });
    expect(r.patientRefundKrw).toBe(1_000_000);
    expect(r.fullRefundReason).toBe('medical_cause');
  });

  it('force majeure → full refund', () => {
    const r = computeRefund({ reason: 'force_majeure', daysToVisit: 2, depositKrw: 1_000_000, policy: POLICY });
    expect(r.patientRefundKrw).toBe(1_000_000);
    expect(r.fullRefundReason).toBe('force_majeure');
  });

  it('no-show → full forfeit split per policy', () => {
    const r = computeRefund({ reason: 'no_show', daysToVisit: 0, depositKrw: 1_000_000, policy: POLICY });
    expect(r.patientRefundKrw).toBe(0);
    expect(r.hospitalForfeitKrw).toBe(600_000);
    expect(r.agencyForfeitKrw).toBe(400_000);
  });

  it('partitions sum to original deposit (no rounding leak)', () => {
    const r = computeRefund({ reason: 'patient_cancel', daysToVisit: 10, depositKrw: 999_999, policy: POLICY });
    expect(r.patientRefundKrw + r.hospitalForfeitKrw + r.agencyForfeitKrw).toBe(999_999);
  });
});
