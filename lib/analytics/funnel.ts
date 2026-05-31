/**
 * Conversion funnel — Lead → Qualified → Quoted → Booked → Treated → Closed.
 *
 * Inputs: counts at each stage. Outputs: per-step + cumulative conversion rates
 * + drop-off magnitudes. All pure — UI calls this with raw counts pulled from
 * `cases` (group-by stage) and `conversations` (lead stage).
 */

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
};

export type FunnelStep = FunnelStage & {
  /** Conversion from the previous stage, basis points. 10000 = 100%. */
  stepConversionBp: number;
  /** Cumulative conversion from the top of the funnel, basis points. */
  cumulativeBp: number;
  /** Absolute drop-off from previous stage. */
  dropOff: number;
};

export function computeFunnel(stages: ReadonlyArray<FunnelStage>): FunnelStep[] {
  if (stages.length === 0) return [];
  const top = stages[0];
  if (!top) return [];
  return stages.map((s, i) => {
    const prev = i > 0 ? stages[i - 1] : null;
    const stepBp = prev && prev.count > 0 ? Math.round((s.count / prev.count) * 10_000) : 10_000;
    const cumulativeBp = top.count > 0 ? Math.round((s.count / top.count) * 10_000) : 0;
    return {
      ...s,
      stepConversionBp: i === 0 ? 10_000 : stepBp,
      cumulativeBp,
      dropOff: prev ? Math.max(0, prev.count - s.count) : 0,
    };
  });
}

/** Standard KoreaGlowUp funnel labels (KO). */
export const STANDARD_FUNNEL_STAGES: Array<{ key: string; label: string }> = [
  { key: 'lead', label: '리드 (Lead)' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'rfq_sent', label: 'RFQ 발송' },
  { key: 'quoted', label: '견적 수신' },
  { key: 'accepted', label: '견적 수락' },
  { key: 'deposit_paid', label: '예약금 수령' },
  { key: 'scheduled', label: '일정 확정' },
  { key: 'in_treatment', label: '시술 중' },
  { key: 'aftercare', label: '사후관리' },
  { key: 'closed_won', label: '정산 완료' },
];
