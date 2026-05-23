import type { TreatmentChart, TreatmentChartItem } from '@/drizzle/schema/treatment-charts';

/**
 * Share-level enforcement.
 *
 * The agency owns the chart. When the chart is shared to the patient PWA,
 * the patient must only see what the share_level allows. Agency-internal
 * data (referral fee, commission) is *never* leaked to the patient regardless
 * of level.
 *
 * Levels (mirrors drizzle/schema/clinical-enums.ts):
 *   - name_only:        procedure names only — no prices, no totals
 *   - name_and_amount:  procedure names + line totals + grand total
 *   - full:             above + discounts + VAT breakdown + deposit/balance
 *
 * Agency commission and referral fee fields are ALWAYS stripped before patient
 * delivery. There is no opt-in for that.
 */
export type ShareLevel = 'name_only' | 'name_and_amount' | 'full';

export type PatientFacingItem = {
  lineNumber: number;
  itemKind: TreatmentChartItem['itemKind'];
  name: string;
  bodyPart: string | null;
  quantity?: number;
  lineTotalKrw?: number;
  discountKrw?: number;
  isAddon?: boolean;
};

export type PatientFacingChart = {
  id: string;
  treatmentDate: string;
  doctorName: string | null;
  shareLevel: ShareLevel;
  items: PatientFacingItem[];
  currency: string;
  subtotalKrw?: number;
  discountTotalKrw?: number;
  vatTotalKrw?: number;
  grandTotalKrw?: number;
  depositReceivedKrw?: number;
  patientBalanceKrw?: number;
  notes?: string | null;
};

/**
 * Strip a chart + items down to the patient-visible projection. Never returns
 * agency-internal fields (referral fee, snapshots, commission). Caller passes
 * the level explicitly so it can override the chart's stored default when an
 * agency manager opens a "preview as patient" view.
 */
export function projectChartForPatient(
  chart: TreatmentChart,
  items: TreatmentChartItem[],
  level: ShareLevel = chart.shareLevel,
): PatientFacingChart {
  const base: PatientFacingChart = {
    id: chart.id,
    treatmentDate: chart.treatmentDate,
    doctorName: chart.doctorName,
    shareLevel: level,
    currency: chart.currency,
    items: items
      .slice()
      .sort((a, b) => a.lineNumber - b.lineNumber)
      .map((it) => projectItem(it, level)),
  };

  if (level === 'name_only') return base;

  base.subtotalKrw = chart.subtotalKrw;
  base.grandTotalKrw = chart.grandTotalKrw;

  if (level === 'full') {
    base.discountTotalKrw = chart.discountTotalKrw;
    base.vatTotalKrw = chart.vatTotalKrw;
    base.depositReceivedKrw = chart.depositReceivedKrw;
    base.patientBalanceKrw = chart.patientBalanceKrw;
    base.notes = chart.notes;
  }

  return base;
}

function projectItem(it: TreatmentChartItem, level: ShareLevel): PatientFacingItem {
  const out: PatientFacingItem = {
    lineNumber: it.lineNumber,
    itemKind: it.itemKind,
    name: it.procedureNameNormalized,
    bodyPart: it.bodyPart,
  };
  if (level === 'name_only') return out;

  out.quantity = it.quantity;
  out.lineTotalKrw = it.lineTotalKrw;
  out.isAddon = it.isAddon;
  if (level === 'full') {
    out.discountKrw = it.discountKrw;
  }
  return out;
}

/** Guard: agency-internal field names that must NEVER leak to patient PWA. */
export const AGENCY_INTERNAL_FIELDS = [
  'referralPolicySnapshotJson',
  'referralFeeTotalKrw',
  'quoteVarianceBp',
  'quoteVarianceFlag',
  'aiExtractionJobId',
  'fxSnapshotJson',
] as const satisfies ReadonlyArray<keyof TreatmentChart>;
