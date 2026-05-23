/**
 * CAC / LTV — pure helpers.
 *
 * CAC (Customer Acquisition Cost) = marketing & sales spend / new acquired patients.
 * LTV (Lifetime Value) = average gross profit per patient over their lifetime with us.
 *
 * For medical tourism, the relevant LTV horizon is 24–36 months
 * (re-touch-ups · follow-up procedures · referrals from happy patients).
 */

export type CacInput = {
  /** Spend across paid channels (UTM-tagged) in KRW for the period. */
  paidSpendKrw: number;
  /** Spend on freelancer commissions for newly acquired (first-case) patients. */
  freelancerSpendKrw: number;
  /** Other acquisition costs (events, fairs, content production). */
  otherSpendKrw: number;
  /** Newly acquired patients in the period. */
  acquiredPatients: number;
};

export type CacResult = {
  paidCacKrw: number;
  blendedCacKrw: number;
  totalSpendKrw: number;
};

export function computeCac(input: CacInput): CacResult {
  const total = input.paidSpendKrw + input.freelancerSpendKrw + input.otherSpendKrw;
  return {
    paidCacKrw: input.acquiredPatients > 0 ? Math.round(input.paidSpendKrw / input.acquiredPatients) : 0,
    blendedCacKrw: input.acquiredPatients > 0 ? Math.round(total / input.acquiredPatients) : 0,
    totalSpendKrw: total,
  };
}

export type LtvInput = {
  /** Average per-case GMV (patient-paid total) for cohort. */
  avgCaseGmvKrw: number;
  /** Agency's net margin rate on a typical case (after hospital takes its share). */
  marginBp: number;
  /** Average number of cases per patient over the LTV horizon. */
  avgCasesPerPatient: number;
};

export type LtvResult = {
  ltvKrw: number;
  marginPerCaseKrw: number;
};

export function computeLtv(input: LtvInput): LtvResult {
  const marginPerCase = Math.round((input.avgCaseGmvKrw * input.marginBp) / 10_000);
  return {
    marginPerCaseKrw: marginPerCase,
    ltvKrw: marginPerCase * input.avgCasesPerPatient,
  };
}

/** LTV:CAC ratio. Health benchmark: > 3.0 healthy, 1.0–3.0 marginal, < 1.0 burning cash. */
export function ratio(ltvKrw: number, cacKrw: number): { value: number; verdict: 'healthy' | 'marginal' | 'burning' } {
  if (cacKrw === 0) return { value: 0, verdict: ltvKrw > 0 ? 'healthy' : 'burning' };
  const r = ltvKrw / cacKrw;
  return {
    value: Math.round(r * 100) / 100,
    verdict: r > 3 ? 'healthy' : r >= 1 ? 'marginal' : 'burning',
  };
}

/** Payback period in months — how long until margin per patient = CAC. */
export function paybackMonths(cacKrw: number, marginPerCaseKrw: number, avgCasesPerYear = 1): number {
  if (marginPerCaseKrw <= 0) return Infinity;
  const monthlyMargin = (marginPerCaseKrw * avgCasesPerYear) / 12;
  return Math.ceil(cacKrw / monthlyMargin);
}
