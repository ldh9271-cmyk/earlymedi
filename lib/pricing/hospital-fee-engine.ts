/**
 * Hospital referral-fee engine — agency's primary revenue source.
 *
 * The hospital pays the agency a percentage of the procedure revenue for each
 * patient successfully delivered. Rates vary by specialty (성형 30%, 피부 20%,
 * 모발 25%, 치과 15%, 안과 15%, 산부인과 15%, 한의원 15%, 검진 10%, 정형 10%,
 * 중증 5–10%) and are negotiated per hospital + signed in `contracts`.
 *
 * The engine is purely a function of:
 *   - the chart's line items (after VAT split)
 *   - the resolved policy snapshot
 *   - optional VIP / repeat-visit / progressive boosts
 *
 * It returns a deterministic breakdown so the hospital's invoice + the
 * agency's revenue can be reconciled line-by-line.
 */

import { summarizeVat, type LineInput } from './vat-calculator';

export type FeeBase = 'gross_amount' | 'net_excl_vat' | 'patient_paid';

export type PackageRule = 'sum_per_item' | 'single_package_rate' | 'minimum_per_item';

export type HospitalFeePolicy = {
  /** Default rate when no per-procedure override matches. Basis points. */
  defaultRateBp: number;
  /** Per-procedure overrides, keyed by procedure code or catalog id. */
  perProcedureBp?: Record<string, number>;
  /** Per-category overrides (procedure_category enum). */
  perCategoryBp?: Record<string, number>;
  /** What dollar amount the rate multiplies — gross / net / patient share. */
  feeBase: FeeBase;
  /** Whether the patient's deposit counts toward the fee base. */
  includeDepositInBase: boolean;
  /** Whether patient direct-pay amounts count. */
  includePatientDirectPay: boolean;
  /** Bundle pricing for packages. */
  packageRule: PackageRule;
  /** Optional VIP override — flat rate add. */
  vipBoostBp?: number;
  /** Optional repeat-visit bonus. */
  repeatVisitBoostBp?: number;
  /** Optional progressive monthly tier ladder. */
  progressive?: Array<{ minPatientsPerMonth: number; rateBp: number }>;
  /** Minimum guaranteed fee per chart (KRW). */
  minGuaranteedKrw?: number;
};

export type FeeContext = {
  /** Patient is VIP for this hospital. */
  isVip?: boolean;
  /** Number of past visits to this hospital. */
  pastVisitCount?: number;
  /** Patients this hospital received from this agency in the current calendar month. */
  monthlyVolumeForHospital?: number;
  /** Amount the patient paid directly to the hospital (KRW). */
  patientDirectPayKrw?: number;
  /** Deposit already received (KRW). */
  depositKrw?: number;
};

export type ChartLine = LineInput & {
  /** Optional procedure-level matcher for per-procedure rates. */
  procedureCode?: string | null;
  /** Optional category for per-category rates. */
  procedureCategory?: string | null;
};

export type FeeBreakdownLine = {
  procedureCode: string | null;
  category: string | null;
  baseKrw: number;
  appliedRateBp: number;
  feeKrw: number;
  source: 'procedure' | 'category' | 'default';
};

export type FeeBreakdown = {
  lines: FeeBreakdownLine[];
  baseTotalKrw: number;
  preBoostFeeKrw: number;
  vipBoostKrw: number;
  repeatVisitBoostKrw: number;
  progressiveBoostKrw: number;
  minGuaranteeAppliedKrw: number;
  totalFeeKrw: number;
};

/**
 * Compute the hospital's referral fee for a single chart against a frozen policy snapshot.
 *
 * Algorithm:
 *   1. Determine each line's fee base (depends on `feeBase`).
 *   2. Resolve the rate per line (procedure > category > default).
 *   3. Apply package rule if applicable (sum/single/min).
 *   4. Apply VIP + repeat-visit + progressive boosts on the aggregate.
 *   5. Apply minimum-guarantee floor.
 */
export function computeHospitalFee(
  lines: ReadonlyArray<ChartLine>,
  policy: HospitalFeePolicy,
  ctx: FeeContext = {},
): FeeBreakdown {
  const vat = summarizeVat(lines);
  const breakdown: FeeBreakdownLine[] = [];

  for (const line of lines) {
    let base: number;
    switch (policy.feeBase) {
      case 'gross_amount':
        base = line.vatIncluded ? line.lineTotalKrw : line.lineTotalKrw;
        if (!line.vatIncluded) {
          // gross = net + vat
          const lineVat =
            line.vatTreatment === 'exempt'
              ? 0
              : Math.round((line.lineTotalKrw * (line.vatRateBp ?? 1_000)) / 10_000);
          base = line.lineTotalKrw + lineVat;
        }
        break;
      case 'patient_paid':
        base = ctx.patientDirectPayKrw ?? 0;
        break;
      case 'net_excl_vat':
      default: {
        if (line.vatTreatment === 'exempt') {
          base = line.lineTotalKrw;
        } else if (line.vatIncluded) {
          const lineVat = Math.round((line.lineTotalKrw * (line.vatRateBp ?? 1_000)) / (10_000 + (line.vatRateBp ?? 1_000)));
          base = line.lineTotalKrw - lineVat;
        } else {
          base = line.lineTotalKrw;
        }
      }
    }

    if (!policy.includePatientDirectPay && policy.feeBase !== 'patient_paid') {
      // already excluded — direct-pay flows through the patient_paid base only
    }

    const { rateBp, source } = resolveRateForLine(line, policy);
    const feeKrw = Math.round((base * rateBp) / 10_000);

    breakdown.push({
      procedureCode: line.procedureCode ?? null,
      category: line.procedureCategory ?? null,
      baseKrw: base,
      appliedRateBp: rateBp,
      feeKrw,
      source,
    });
  }

  // Package rule: only meaningful when 2+ procedure lines and a per-package rate exists.
  let preBoostFee = breakdown.reduce((s, l) => s + l.feeKrw, 0);
  if (policy.packageRule === 'minimum_per_item' && breakdown.length > 1) {
    const min = Math.min(...breakdown.map((l) => l.feeKrw));
    preBoostFee = min * breakdown.length;
  } else if (policy.packageRule === 'single_package_rate' && breakdown.length > 1) {
    const baseTotal = breakdown.reduce((s, l) => s + l.baseKrw, 0);
    preBoostFee = Math.round((baseTotal * policy.defaultRateBp) / 10_000);
  }

  // Deposit handling: when includeDepositInBase is false and the deposit already
  // contributed to the line totals, subtract its prorated fee. Practical impact
  // is small in the canonical net-of-VAT case; we add a guard for completeness.
  if (!policy.includeDepositInBase && ctx.depositKrw && ctx.depositKrw > 0) {
    const baseTotal = breakdown.reduce((s, l) => s + l.baseKrw, 0);
    if (baseTotal > 0) {
      const depositFee = Math.round((ctx.depositKrw * policy.defaultRateBp) / 10_000);
      preBoostFee = Math.max(0, preBoostFee - depositFee);
    }
  }

  const vipBoostKrw = ctx.isVip && policy.vipBoostBp
    ? Math.round((preBoostFee * policy.vipBoostBp) / 10_000)
    : 0;

  const repeatVisitBoostKrw =
    (ctx.pastVisitCount ?? 0) > 0 && policy.repeatVisitBoostBp
      ? Math.round((preBoostFee * policy.repeatVisitBoostBp) / 10_000)
      : 0;

  let progressiveBoostKrw = 0;
  if (policy.progressive && (ctx.monthlyVolumeForHospital ?? 0) > 0) {
    const v = ctx.monthlyVolumeForHospital ?? 0;
    const tier = [...policy.progressive]
      .sort((a, b) => b.minPatientsPerMonth - a.minPatientsPerMonth)
      .find((t) => v >= t.minPatientsPerMonth);
    if (tier && tier.rateBp > policy.defaultRateBp) {
      const delta = tier.rateBp - policy.defaultRateBp;
      progressiveBoostKrw = Math.round((breakdown.reduce((s, l) => s + l.baseKrw, 0) * delta) / 10_000);
    }
  }

  const subtotal = preBoostFee + vipBoostKrw + repeatVisitBoostKrw + progressiveBoostKrw;
  let minGuaranteeAppliedKrw = 0;
  let totalFee = subtotal;
  if (policy.minGuaranteedKrw && subtotal < policy.minGuaranteedKrw) {
    minGuaranteeAppliedKrw = policy.minGuaranteedKrw - subtotal;
    totalFee = policy.minGuaranteedKrw;
  }

  return {
    lines: breakdown,
    baseTotalKrw: policy.feeBase === 'net_excl_vat' ? vat.netTotalKrw : breakdown.reduce((s, l) => s + l.baseKrw, 0),
    preBoostFeeKrw: preBoostFee,
    vipBoostKrw,
    repeatVisitBoostKrw,
    progressiveBoostKrw,
    minGuaranteeAppliedKrw,
    totalFeeKrw: totalFee,
  };
}

function resolveRateForLine(
  line: ChartLine,
  policy: HospitalFeePolicy,
): { rateBp: number; source: 'procedure' | 'category' | 'default' } {
  if (line.procedureCode && policy.perProcedureBp?.[line.procedureCode] !== undefined) {
    return { rateBp: policy.perProcedureBp[line.procedureCode] as number, source: 'procedure' };
  }
  if (line.procedureCategory && policy.perCategoryBp?.[line.procedureCategory] !== undefined) {
    return { rateBp: policy.perCategoryBp[line.procedureCategory] as number, source: 'category' };
  }
  return { rateBp: policy.defaultRateBp, source: 'default' };
}

/**
 * Standard Korean medical-tourism referral rates by category. These are the
 * defaults the seed populates so a fresh hospital onboarding has working
 * numbers out of the box — they are typical mid-market rates, not legal advice.
 */
export const STANDARD_CATEGORY_RATES_BP: Record<string, number> = {
  plastic_surgery: 3_000, // 30%
  hair: 2_500, // 25%
  dermatology: 2_000, // 20%
  dental: 1_500, // 15%
  ophthalmology: 1_500, // 15%
  obstetrics: 1_500, // 15%
  oriental: 1_500, // 15%
  cosmetic_dental: 1_500, // 15%
  fertility: 1_500, // 15%
  checkup: 1_000, // 10%
  orthopedic: 1_000, // 10%
  ent: 1_000, // 10%
  urology: 1_000, // 10%
  gastroenterology: 1_000,
  neurology: 800,
  cardiology: 700,
  oncology: 500,
  general: 1_000,
};
