import Papa from 'papaparse';
import type { EmrAdapter, NormalizedEmrChart, NormalizedEmrChartItem } from './index';
import type { ProcedureCategory } from './shared';

/**
 * Minimal CSV → chart adapter. The expected layout (one row = one chart line):
 *
 *   external_chart_id,treatment_date,doctor_name,patient_external_id,category,
 *   procedure_name,procedure_code,body_part,quantity,unit_price_krw,
 *   vat_included,vat_rate_bp,is_addon,discount_krw,deposit_received_krw,notes
 *
 * The first row is the header. Rows with the same `external_chart_id` are
 * grouped into a single chart; `deposit_received_krw` is taken from the first
 * row of each group.
 */
export class CsvEmrAdapter implements EmrAdapter {
  readonly mode = 'csv' as const;

  parse(input: unknown): NormalizedEmrChart[] {
    if (typeof input !== 'string') return [];
    const parsed = Papa.parse<Record<string, string>>(input, {
      header: true,
      skipEmptyLines: true,
    });
    if (parsed.errors.length > 0) {
      // Skip silently — the caller can re-parse with a strict mode in Phase 6.
    }
    const groups = new Map<string, NormalizedEmrChart>();
    for (const row of parsed.data) {
      const key = row.external_chart_id?.trim();
      if (!key) continue;
      let chart = groups.get(key);
      if (!chart) {
        chart = {
          externalChartId: key,
          treatmentDate: row.treatment_date ?? '',
          doctorName: row.doctor_name || undefined,
          patientExternalId: row.patient_external_id ?? '',
          category: toCategory(row.category),
          depositReceivedKrw: toInt(row.deposit_received_krw),
          notes: row.notes || undefined,
          items: [],
        };
        groups.set(key, chart);
      }
      chart.items.push(rowToItem(row));
    }
    return [...groups.values()];
  }
}

function rowToItem(row: Record<string, string>): NormalizedEmrChartItem {
  return {
    rawText: row.procedure_name ?? '',
    procedureName: row.procedure_name ?? '',
    procedureCode: row.procedure_code || undefined,
    bodyPart: row.body_part || undefined,
    quantity: Math.max(1, toInt(row.quantity, 1)),
    unitPriceKrw: toInt(row.unit_price_krw),
    vatIncluded: row.vat_included === 'true' || row.vat_included === '1',
    vatRateBp: toInt(row.vat_rate_bp, 1000),
    isAddon: row.is_addon === 'true' || row.is_addon === '1',
    discountKrw: toInt(row.discount_krw),
  };
}

function toInt(v: string | undefined, dflt = 0): number {
  if (!v) return dflt;
  const n = Number.parseInt(v.replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? n : dflt;
}

const KNOWN_CATEGORIES: ReadonlySet<ProcedureCategory> = new Set([
  'plastic_surgery',
  'dermatology',
  'hair',
  'dental',
  'ophthalmology',
  'obstetrics',
  'oriental',
  'checkup',
  'orthopedic',
  'cardiology',
  'oncology',
  'gastroenterology',
  'neurology',
  'urology',
  'ent',
  'fertility',
  'cosmetic_dental',
  'general',
]);

function toCategory(v: string | undefined): ProcedureCategory {
  const c = (v ?? 'general').trim() as ProcedureCategory;
  return KNOWN_CATEGORIES.has(c) ? c : 'general';
}
