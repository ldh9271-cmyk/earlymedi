/**
 * VAT calculator — Korean medical-tourism domain.
 *
 * Korean medical services have a split VAT regime:
 *   - exempt:  doctor-prescribed treatment (의료법 면세) — 부가가치세 0%
 *   - taxable: cosmetic / elective procedures (미용 시술) — 부가가치세 10%
 *   - mixed:   a single chart contains both — VAT computed line-by-line
 *
 * The hospital can also report prices three ways:
 *   - inclusive: line_total is gross (incl. VAT). VAT = gross × rate / (10000 + rate)
 *   - exclusive: line_total is net (excl. VAT). VAT = net × rate / 10000
 *   - separate:  VAT is already on its own line
 *
 * All inputs/outputs are integer KRW (won, the minor unit).
 */

export type VatTreatment = 'exempt' | 'taxable' | 'mixed';
export type VatMode = 'inclusive' | 'exclusive' | 'separate';

export const VAT_RATE_BP = 1_000; // 10.00% in basis points (10000 = 100%)

export type LineInput = {
  lineTotalKrw: number;
  vatTreatment: VatTreatment;
  vatIncluded: boolean; // true → inclusive, false → exclusive
  vatRateBp?: number; // override default
};

export type LineVatResult = {
  /** Net (excl. VAT) portion. Used as the referral-fee base. */
  netKrw: number;
  /** VAT amount in KRW. */
  vatKrw: number;
  /** Gross (incl. VAT). Always equals netKrw + vatKrw. */
  grossKrw: number;
};

export function computeLineVat(input: LineInput): LineVatResult {
  if (input.vatTreatment === 'exempt') {
    return { netKrw: input.lineTotalKrw, vatKrw: 0, grossKrw: input.lineTotalKrw };
  }
  const rate = input.vatRateBp ?? VAT_RATE_BP;
  if (input.vatIncluded) {
    // line_total is gross.
    const vat = Math.round((input.lineTotalKrw * rate) / (10_000 + rate));
    const net = input.lineTotalKrw - vat;
    return { netKrw: net, vatKrw: vat, grossKrw: input.lineTotalKrw };
  }
  const vat = Math.round((input.lineTotalKrw * rate) / 10_000);
  return { netKrw: input.lineTotalKrw, vatKrw: vat, grossKrw: input.lineTotalKrw + vat };
}

export type ChartVatSummary = {
  netTotalKrw: number;
  vatTotalKrw: number;
  grossTotalKrw: number;
  exemptNetKrw: number;
  taxableNetKrw: number;
};

/** Sum a chart's lines into the VAT summary that the fee engine consumes. */
export function summarizeVat(lines: ReadonlyArray<LineInput>): ChartVatSummary {
  let net = 0;
  let vat = 0;
  let exemptNet = 0;
  let taxableNet = 0;
  for (const l of lines) {
    const r = computeLineVat(l);
    net += r.netKrw;
    vat += r.vatKrw;
    if (l.vatTreatment === 'exempt') exemptNet += r.netKrw;
    else taxableNet += r.netKrw;
  }
  return { netTotalKrw: net, vatTotalKrw: vat, grossTotalKrw: net + vat, exemptNetKrw: exemptNet, taxableNetKrw: taxableNet };
}
