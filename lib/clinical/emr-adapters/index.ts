/**
 * EMR import adapter contract.
 *
 * Hospitals operate one of three integration modes (`emr_integrations.mode`):
 *   - 'csv'    : nightly CSV upload to Supabase Storage; this module parses
 *   - 'api'    : REST pull (Phase 6+ — varies per EMR vendor)
 *   - 'manual' : no integration; the hospital types directly into the UI
 *
 * The adapter normalizes whatever the vendor exports into our
 * `NormalizedEmrChart` shape, which the treatment-chart engine then ingests.
 */

import type { ProcedureCategory } from './shared';

export type NormalizedEmrChartItem = {
  rawText: string;
  procedureName: string;
  procedureCode?: string;
  bodyPart?: string;
  quantity: number;
  unitPriceKrw: number;
  vatIncluded: boolean;
  vatRateBp: number;
  isAddon: boolean;
  discountKrw: number;
};

export type NormalizedEmrChart = {
  externalChartId: string;
  treatmentDate: string; // YYYY-MM-DD
  doctorName?: string;
  patientExternalId: string;
  category: ProcedureCategory;
  items: NormalizedEmrChartItem[];
  depositReceivedKrw: number;
  notes?: string;
};

export interface EmrAdapter {
  readonly mode: 'csv' | 'api' | 'manual';
  /** Parse one upload/response into zero-or-more normalized charts. */
  parse(input: unknown): NormalizedEmrChart[];
}

export { CsvEmrAdapter } from './csv';
