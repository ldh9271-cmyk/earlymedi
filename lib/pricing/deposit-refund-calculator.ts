/**
 * Deposit refund calculator.
 *
 * Given a cancellation event (with reason + days-to-visit), determine:
 *   - how much of the deposit goes back to the patient
 *   - how much the hospital keeps (forfeit share)
 *   - how much the agency keeps (forfeit share)
 *
 * Inputs are deterministic: tier ladder + split policy + cancellation context.
 * Output is integer KRW, partitioned so the three buckets sum to the original
 * deposit (rounding spill goes to the patient bucket).
 */

import type { CancellationSplit, DepositPolicy, RefundTier } from './deposit-engine';

export type CancellationReason =
  | 'patient_cancel' // ordinary patient-initiated cancellation
  | 'medical_cause' // doctor advice / hospitalization elsewhere — full refund per policy flag
  | 'force_majeure' // visa denial, natural disaster, airline shutdown
  | 'no_show'; // patient never showed up

export type RefundContext = {
  reason: CancellationReason;
  daysToVisit: number;
  depositKrw: number;
  policy: DepositPolicy;
};

export type RefundBreakdown = {
  patientRefundKrw: number;
  hospitalForfeitKrw: number;
  agencyForfeitKrw: number;
  appliedTier: RefundTier | null;
  fullRefundReason: 'medical_cause' | 'force_majeure' | null;
};

export function computeRefund(ctx: RefundContext): RefundBreakdown {
  const { reason, depositKrw, policy } = ctx;
  if (depositKrw <= 0) {
    return {
      patientRefundKrw: 0,
      hospitalForfeitKrw: 0,
      agencyForfeitKrw: 0,
      appliedTier: null,
      fullRefundReason: null,
    };
  }

  if (reason === 'medical_cause' && policy.medicalCauseFullRefund) {
    return {
      patientRefundKrw: depositKrw,
      hospitalForfeitKrw: 0,
      agencyForfeitKrw: 0,
      appliedTier: null,
      fullRefundReason: 'medical_cause',
    };
  }
  if (reason === 'force_majeure' && policy.forceMajeureFullRefund) {
    return {
      patientRefundKrw: depositKrw,
      hospitalForfeitKrw: 0,
      agencyForfeitKrw: 0,
      appliedTier: null,
      fullRefundReason: 'force_majeure',
    };
  }

  if (reason === 'no_show') {
    // Forfeit everything, split per policy.
    return splitForfeit(depositKrw, policy.cancellationSplit, null);
  }

  // Patient cancel — find the tier with the highest threshold ≤ daysToVisit.
  const tiers = [...policy.refundTiers].sort((a, b) => b.minDaysToVisit - a.minDaysToVisit);
  const applied = tiers.find((t) => ctx.daysToVisit >= t.minDaysToVisit) ?? null;
  const refundBp = applied?.refundBp ?? 0;
  const refund = Math.round((depositKrw * refundBp) / 10_000);
  const forfeit = depositKrw - refund;

  if (forfeit === 0) {
    return {
      patientRefundKrw: refund,
      hospitalForfeitKrw: 0,
      agencyForfeitKrw: 0,
      appliedTier: applied,
      fullRefundReason: null,
    };
  }

  const split = splitForfeit(forfeit, policy.cancellationSplit, applied);
  return {
    patientRefundKrw: refund + split.patientRefundKrw,
    hospitalForfeitKrw: split.hospitalForfeitKrw,
    agencyForfeitKrw: split.agencyForfeitKrw,
    appliedTier: applied,
    fullRefundReason: null,
  };
}

function splitForfeit(
  forfeitKrw: number,
  split: CancellationSplit,
  tier: RefundTier | null,
): RefundBreakdown {
  // `cancellation_split` is expressed as basis points of the *forfeit*.
  // patient_refund_bp inside the split is a secondary share (e.g. policy
  // returns 5% to the patient even on no-show as a goodwill gesture).
  const hospital = Math.round((forfeitKrw * split.hospitalBp) / 10_000);
  const agency = Math.round((forfeitKrw * split.agencyBp) / 10_000);
  const patientExtra = Math.max(0, forfeitKrw - hospital - agency);
  return {
    patientRefundKrw: patientExtra,
    hospitalForfeitKrw: hospital,
    agencyForfeitKrw: agency,
    appliedTier: tier,
    fullRefundReason: null,
  };
}
