/**
 * Deposit engine — computes the deposit amount due for a quote and the
 * settlement split when the patient cancels.
 *
 * Hospitals configure their deposit policy per `hospital_deposit_policies`:
 *   - fixed amount (KRW), OR percentage of quote (basis points)
 *   - collector: agency_collects / hospital_direct / escrow
 *   - timing: on_quote_accepted / days_before_visit / on_arrival
 *   - refund tiers based on days-to-visit
 *   - medical / force-majeure full-refund overrides
 *   - cancellation split when refund is partial
 *
 * Pure functions, no I/O. Caller passes the policy + context, gets numbers.
 */

export type DepositCollector = 'agency_collects' | 'hospital_direct' | 'escrow';
export type DepositTiming = 'on_quote_accepted' | 'days_before_visit' | 'on_arrival';

export type DepositPolicy = {
  isEnabled: boolean;
  fixedAmountKrw?: number | null;
  percentageBp?: number | null;
  collector: DepositCollector;
  timing: DepositTiming;
  daysBeforeVisit?: number | null;
  refundTiers: RefundTier[];
  medicalCauseFullRefund: boolean;
  forceMajeureFullRefund: boolean;
  includeInReferralBase: boolean;
  cancellationSplit: CancellationSplit;
  /** Auto-cancel the reservation if deposit not paid within N hours. 0 = disabled. */
  autoCancelOnUnpaidHours?: number | null;
};

export type RefundTier = {
  /** Refund kicks in when remaining days-until-visit ≥ this value. */
  minDaysToVisit: number;
  /** Refund percentage in basis points (10000 = 100%). */
  refundBp: number;
  label?: string;
};

export type CancellationSplit = {
  /** Forfeited portion → hospital. */
  hospitalBp: number;
  /** Forfeited portion → agency. */
  agencyBp: number;
  /** Refunded portion → patient. */
  patientRefundBp: number;
};

export type ComputeDepositInput = {
  policy: DepositPolicy;
  quoteTotalKrw: number;
};

export type ComputeDepositResult = {
  required: boolean;
  amountKrw: number;
  collector: DepositCollector;
  dueAt: 'on_quote_accepted' | 'days_before_visit' | 'on_arrival';
  daysBeforeVisit: number | null;
};

export function computeDeposit({ policy, quoteTotalKrw }: ComputeDepositInput): ComputeDepositResult {
  if (!policy.isEnabled) {
    return {
      required: false,
      amountKrw: 0,
      collector: policy.collector,
      dueAt: policy.timing,
      daysBeforeVisit: policy.daysBeforeVisit ?? null,
    };
  }
  let amount = 0;
  if (typeof policy.fixedAmountKrw === 'number' && policy.fixedAmountKrw > 0) {
    amount = policy.fixedAmountKrw;
  } else if (typeof policy.percentageBp === 'number' && policy.percentageBp > 0) {
    amount = Math.round((quoteTotalKrw * policy.percentageBp) / 10_000);
  }
  return {
    required: amount > 0,
    amountKrw: amount,
    collector: policy.collector,
    dueAt: policy.timing,
    daysBeforeVisit: policy.daysBeforeVisit ?? null,
  };
}

/**
 * Standard refund-tier ladder per the project spec:
 *   D-30 → 100%, D-14 → 70%, D-7 → 50%, D-3 → 0%, no-show → 0%.
 * Used as the default seed when a hospital onboards.
 */
export const STANDARD_REFUND_TIERS: ReadonlyArray<RefundTier> = [
  { minDaysToVisit: 30, refundBp: 10_000, label: 'D-30+: 전액 환불' },
  { minDaysToVisit: 14, refundBp: 7_000, label: 'D-14+: 70% 환불' },
  { minDaysToVisit: 7, refundBp: 5_000, label: 'D-7+: 50% 환불' },
  { minDaysToVisit: 3, refundBp: 0, label: 'D-3+: 환불 불가' },
  { minDaysToVisit: 0, refundBp: 0, label: '노쇼: 환불 불가' },
];

/** Default cancellation split (hospital 60% / agency 40% of forfeit, patient 0). */
export const STANDARD_CANCELLATION_SPLIT: CancellationSplit = {
  hospitalBp: 6_000,
  agencyBp: 4_000,
  patientRefundBp: 0,
};
