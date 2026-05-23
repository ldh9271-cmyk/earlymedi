/**
 * Tax calculator — Korean withholding + VAT + cross-border treaty handling.
 *
 * Withholding scenarios:
 *   - KR resident (사업자등록 X): 3.30% (소득세 3% + 지방세 0.3%) on freelance income
 *   - KR business (사업자등록 O): 0% withholding, the agency must receive a tax invoice (세금계산서)
 *   - non-resident: applies the relevant double-tax treaty rate, defaults to 22% if absent
 *
 * VAT (부가가치세):
 *   - patient-facing services flow through the medical exemption logic — handled
 *     by vat-calculator.ts at the chart-line level
 *   - agency → hospital invoices for the referral fee carry VAT of their own;
 *     this module returns the treatment we should bill against
 */

export type ResidencyTaxProfile =
  | { kind: 'kr_resident_individual' }
  | { kind: 'kr_business' }
  | { kind: 'non_resident'; countryCode: string; treatyWithholdingBp?: number };

export type WithholdingResult = {
  withholdingBp: number;
  reason: 'kr_resident_individual' | 'kr_business' | 'treaty' | 'non_resident_default';
};

const DEFAULT_NON_RESIDENT_BP = 2_200; // 22%
const KR_RESIDENT_FREELANCER_BP = 330; // 3.30%

/** Pick the withholding rate from a tax profile. */
export function withholdingRate(profile: ResidencyTaxProfile): WithholdingResult {
  switch (profile.kind) {
    case 'kr_resident_individual':
      return { withholdingBp: KR_RESIDENT_FREELANCER_BP, reason: 'kr_resident_individual' };
    case 'kr_business':
      return { withholdingBp: 0, reason: 'kr_business' };
    case 'non_resident':
      if (typeof profile.treatyWithholdingBp === 'number') {
        return { withholdingBp: profile.treatyWithholdingBp, reason: 'treaty' };
      }
      return { withholdingBp: DEFAULT_NON_RESIDENT_BP, reason: 'non_resident_default' };
  }
}

/** Apply withholding to a gross amount, returning (net payable, tax). */
export function applyWithholding(grossKrw: number, profile: ResidencyTaxProfile): {
  netKrw: number;
  taxKrw: number;
  rateBp: number;
} {
  const r = withholdingRate(profile);
  const tax = Math.round((grossKrw * r.withholdingBp) / 10_000);
  return { netKrw: Math.max(0, grossKrw - tax), taxKrw: tax, rateBp: r.withholdingBp };
}

/**
 * Treaty look-up table — extend as new corridors come online. Values from
 * Korean tax treaty schedules (interest/business income — independent personal
 * services). Always check with the local tax counsel before paying out.
 */
export const TREATY_WITHHOLDING_BP: Record<string, number> = {
  US: 1_200, // 12% (US-KR tax treaty business profits)
  JP: 1_000, // 10%
  CN: 1_000, // 10%
  VN: 1_000, // 10% (KR-VN)
  TH: 1_000,
  AE: 1_000,
  RU: 1_000,
  GB: 1_000,
  FR: 1_000,
  DE: 1_000,
  SG: 1_000,
};

/** Build a `non_resident` profile from a country code, picking treaty if known. */
export function nonResidentProfile(countryCode: string): ResidencyTaxProfile {
  const treatyWithholdingBp = TREATY_WITHHOLDING_BP[countryCode.toUpperCase()];
  return treatyWithholdingBp !== undefined
    ? { kind: 'non_resident', countryCode, treatyWithholdingBp }
    : { kind: 'non_resident', countryCode };
}
