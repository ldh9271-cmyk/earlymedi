/**
 * Platform settlement-fee — what EarlyMedi charges its B2B customers (agency·
 * medical·non_medical) on every successful settlement.
 *
 * Rates come from `billing_plans.settlementFeeBp` and are fixed per plan tier:
 *   - Agency Starter  1.50% / Growth 1.00% / Pro 0.70%
 *   - Medical PayGo   0.50% / Committed 0.30%
 *   - Partner Listing 3.00% / Active 1.50%
 *
 * Three policies for who bears the fee (project spec):
 *   A) agency-only (default)            — Agency 부담
 *   B) patient-add-on                   — 환자 가산
 *   C) shared                           — 분담
 */

export type FeeBearer = 'agency_only' | 'patient_add_on' | 'shared';

export type PlatformFeeInput = {
  gmvKrw: number; // gross merchandise value (the patient-facing total)
  settlementFeeBp: number;
  bearer: FeeBearer;
  /** Only used for `shared`. Defaults to 50/50. */
  agencyShareBp?: number;
};

export type PlatformFeeBreakdown = {
  totalFeeKrw: number;
  agencyFeeKrw: number;
  patientAddOnKrw: number;
};

export function computePlatformFee(input: PlatformFeeInput): PlatformFeeBreakdown {
  const fee = Math.round((input.gmvKrw * input.settlementFeeBp) / 10_000);
  if (input.bearer === 'agency_only') {
    return { totalFeeKrw: fee, agencyFeeKrw: fee, patientAddOnKrw: 0 };
  }
  if (input.bearer === 'patient_add_on') {
    return { totalFeeKrw: fee, agencyFeeKrw: 0, patientAddOnKrw: fee };
  }
  // shared
  const agencyShareBp = input.agencyShareBp ?? 5_000;
  const agencyPortion = Math.round((fee * agencyShareBp) / 10_000);
  return {
    totalFeeKrw: fee,
    agencyFeeKrw: agencyPortion,
    patientAddOnKrw: fee - agencyPortion,
  };
}
