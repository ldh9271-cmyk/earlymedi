/**
 * Quote-vs-chart variance classifier.
 *
 * The quote is sent to the patient *before* treatment. The treatment chart
 * records *actual* services delivered. A delta is expected — but a large
 * positive delta needs explicit re-consent (potential dispute).
 *
 * Spec tiers (from project brief — section "시술 차트"):
 *   |delta| ≤ 5%     → 'auto'              auto-approved, no human review
 *   5% < |delta| ≤ 15% → 'manager'           manager nudge in agency inbox
 *   |delta| > 15%   → 'patient_reconsent'  patient re-acceptance required
 *
 * Returned `bp` is signed: positive = chart higher than quote (more billed).
 */

export type VarianceFlag = 'auto' | 'manager' | 'patient_reconsent';

export type VarianceResult = {
  /** (chart - quote) / quote, in basis points (10000 = 100%). */
  bp: number;
  flag: VarianceFlag;
  /** True when the chart total is greater than the quoted total. */
  overcharge: boolean;
};

export const VARIANCE_AUTO_BP = 500; // ±5%
export const VARIANCE_MANAGER_BP = 1_500; // ±15%

export function classifyVariance(quoteTotalKrw: number, chartTotalKrw: number): VarianceResult {
  if (quoteTotalKrw <= 0) {
    // No quote on file — treat as "manager review" so nothing slips through.
    return { bp: 0, flag: 'manager', overcharge: chartTotalKrw > 0 };
  }
  const deltaBp = Math.round(((chartTotalKrw - quoteTotalKrw) / quoteTotalKrw) * 10_000);
  const abs = Math.abs(deltaBp);
  const flag: VarianceFlag =
    abs <= VARIANCE_AUTO_BP
      ? 'auto'
      : abs <= VARIANCE_MANAGER_BP
        ? 'manager'
        : 'patient_reconsent';
  return { bp: deltaBp, flag, overcharge: deltaBp > 0 };
}

/** Human-readable label, ko_KR. */
export function describeVariance(v: VarianceResult): string {
  const pct = (v.bp / 100).toFixed(2);
  const sign = v.bp > 0 ? '+' : '';
  const tag = v.flag === 'auto' ? '자동 승인' : v.flag === 'manager' ? '매니저 검토' : '환자 재동의';
  return `${sign}${pct}% (${tag})`;
}
