/**
 * Freelancer / referral commission engine.
 *
 * After the hospital pays the agency a referral fee, the agency may need to
 * forward a slice to the freelancer who sourced the patient (or to multiple
 * referrers when a case had a shared attribution).
 *
 * Spec resolution order: case > individual > category > organization default.
 * Use `resolveCommissionPolicy` from policy-resolver to pick before calling here.
 *
 * The engine handles:
 *   - calc_type: percent_of_revenue | percent_of_margin | fixed_amount | tiered
 *   - base:      patient_paid | hospital_quote | net_margin | hospital_referral_fee | agency_net_after_costs
 *   - tier ladders (volume / cumulative GMV)
 *   - VAT treatment (commission base inclusive vs exclusive)
 *   - withholding tax (KR resident 3.3%, foreign per treaty)
 *
 * Returns the gross commission, withholding amount, and net payable.
 */

export type CommissionCalcType =
  | 'percent_of_revenue'
  | 'percent_of_margin'
  | 'fixed_amount'
  | 'tiered';

export type CommissionBase =
  | 'patient_paid'
  | 'hospital_quote'
  | 'net_margin'
  | 'hospital_referral_fee'
  | 'agency_net_after_costs';

export type CommissionPolicy = {
  calcType: CommissionCalcType;
  base: CommissionBase;
  /** For percent_of_*; basis points. */
  rateBp?: number;
  /** For fixed_amount; KRW. */
  fixedAmountKrw?: number;
  /** For tiered; see resolveTier. */
  tiers?: Array<{ minThreshold: number; rateBp: number }>;
  vatTreatment: 'inclusive' | 'exclusive' | 'not_applicable';
  /** Withholding rate. KR resident default 3.30% = 330 bp. */
  withholdingTaxBp: number;
  /** Optional volume bonus on top of base commission. */
  monthlyVolumeBonusBp?: number;
  /** Penalty for cancellations attributed to this referrer (basis points). */
  cancellationPenaltyBp?: number;
};

export type CommissionContext = {
  patientPaidKrw: number;
  hospitalQuoteKrw: number;
  hospitalReferralFeeKrw: number;
  agencyCostsKrw: number;
  /** Volume metric — monthly case count or cumulative GMV. */
  monthlyVolumeMetric?: number;
  /** Whether this case was cancelled (forfeit penalty). */
  isCancelled?: boolean;
};

export type CommissionBreakdown = {
  baseKrw: number;
  appliedRateBp: number;
  grossKrw: number;
  bonusKrw: number;
  penaltyKrw: number;
  withholdingKrw: number;
  netPayableKrw: number;
};

export function computeCommission(
  policy: CommissionPolicy,
  ctx: CommissionContext,
): CommissionBreakdown {
  const base = pickBase(policy.base, ctx);

  let gross = 0;
  let appliedRate = policy.rateBp ?? 0;

  switch (policy.calcType) {
    case 'percent_of_revenue':
    case 'percent_of_margin':
      gross = Math.round((base * (policy.rateBp ?? 0)) / 10_000);
      break;
    case 'fixed_amount':
      gross = policy.fixedAmountKrw ?? 0;
      appliedRate = 0;
      break;
    case 'tiered': {
      const tier = resolveTier(policy.tiers ?? [], ctx.monthlyVolumeMetric ?? 0);
      appliedRate = tier?.rateBp ?? 0;
      gross = Math.round((base * appliedRate) / 10_000);
      break;
    }
  }

  const bonusKrw =
    policy.monthlyVolumeBonusBp && (ctx.monthlyVolumeMetric ?? 0) > 0
      ? Math.round((gross * policy.monthlyVolumeBonusBp) / 10_000)
      : 0;

  const penaltyKrw =
    ctx.isCancelled && policy.cancellationPenaltyBp
      ? Math.round((gross * policy.cancellationPenaltyBp) / 10_000)
      : 0;

  const beforeTax = Math.max(0, gross + bonusKrw - penaltyKrw);
  const withholdingKrw = Math.round((beforeTax * policy.withholdingTaxBp) / 10_000);
  const netPayableKrw = Math.max(0, beforeTax - withholdingKrw);

  return {
    baseKrw: base,
    appliedRateBp: appliedRate,
    grossKrw: gross,
    bonusKrw,
    penaltyKrw,
    withholdingKrw,
    netPayableKrw,
  };
}

function pickBase(base: CommissionBase, ctx: CommissionContext): number {
  switch (base) {
    case 'patient_paid':
      return ctx.patientPaidKrw;
    case 'hospital_quote':
      return ctx.hospitalQuoteKrw;
    case 'hospital_referral_fee':
      return ctx.hospitalReferralFeeKrw;
    case 'net_margin':
      return Math.max(0, ctx.hospitalReferralFeeKrw - ctx.agencyCostsKrw);
    case 'agency_net_after_costs':
      return Math.max(0, ctx.patientPaidKrw - ctx.hospitalQuoteKrw - ctx.agencyCostsKrw);
  }
}

function resolveTier(
  tiers: ReadonlyArray<{ minThreshold: number; rateBp: number }>,
  metric: number,
): { minThreshold: number; rateBp: number } | null {
  const sorted = [...tiers].sort((a, b) => b.minThreshold - a.minThreshold);
  for (const t of sorted) {
    if (metric >= t.minThreshold) return t;
  }
  return null;
}

/**
 * Multi-referrer split: distribute one commission pool across N payees with
 * arbitrary share percentages. Used when a case is attributed to multiple
 * freelancers (e.g. A 70% + B 30%) per the case-level commission policy.
 * Rounding spill goes to the highest-share payee for determinism.
 */
export function splitCommissionPool(
  totalKrw: number,
  shares: ReadonlyArray<{ payeeId: string; shareBp: number }>,
): Array<{ payeeId: string; amountKrw: number }> {
  const totalBp = shares.reduce((s, x) => s + x.shareBp, 0);
  if (totalBp <= 0 || totalKrw <= 0) return shares.map((s) => ({ payeeId: s.payeeId, amountKrw: 0 }));

  const out = shares.map((s) => ({
    payeeId: s.payeeId,
    amountKrw: Math.floor((totalKrw * s.shareBp) / totalBp),
  }));
  const allocated = out.reduce((s, x) => s + x.amountKrw, 0);
  const remainder = totalKrw - allocated;
  if (remainder !== 0 && out.length > 0) {
    const top = out.reduce((a, b) => (a.amountKrw >= b.amountKrw ? a : b));
    top.amountKrw += remainder;
  }
  return out;
}

/** Standard withholding rate for KR resident freelancer (3.30%). */
export const KR_RESIDENT_WITHHOLDING_BP = 330;
