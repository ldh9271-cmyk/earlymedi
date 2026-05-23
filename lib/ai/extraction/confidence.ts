/**
 * Confidence thresholds. The model returns per-field confidence in
 * basis-points × 100. Front-end colors:
 *
 *   >= 9000 → green   (auto-apply)
 *   7000–8999 → amber (review)
 *   <  7000 → red     (re-check)
 *
 * Overall confidence is the min across declared key fields.
 */

export type ConfidenceColor = 'green' | 'amber' | 'red';

export function colorFor(bp: number): ConfidenceColor {
  if (bp >= 9000) return 'green';
  if (bp >= 7000) return 'amber';
  return 'red';
}

export function classifyOverall(
  perField: Record<string, number>,
  keyFields: readonly string[],
): { overallBp: number; color: ConfidenceColor } {
  const values = keyFields.map((k) => perField[k]).filter((v): v is number => typeof v === 'number');
  const overallBp = values.length === 0 ? 0 : Math.min(...values);
  return { overallBp, color: colorFor(overallBp) };
}

export const AUTO_APPLY_THRESHOLD_BP = 9000;
export const REVIEW_THRESHOLD_BP = 7000;
