/**
 * Money utilities.
 *
 * Hard rule: every monetary amount is stored as an integer in the currency's
 * minor unit (KRW = won, USD = cent, JPY = yen). All math must go through this
 * module — no JS floats in finance-critical paths.
 */

import type { CurrencyCode } from './currency';

const MINOR_UNIT_EXPONENT: Record<CurrencyCode, number> = {
  KRW: 0,
  JPY: 0,
  VND: 0,
  USD: 2,
  EUR: 2,
  CNY: 2,
  RUB: 2,
  THB: 2,
  AED: 2,
};

export function toMinorUnits(major: number, currency: CurrencyCode): number {
  const exponent = MINOR_UNIT_EXPONENT[currency];
  return Math.round(major * 10 ** exponent);
}

export function fromMinorUnits(minor: number, currency: CurrencyCode): number {
  const exponent = MINOR_UNIT_EXPONENT[currency];
  return minor / 10 ** exponent;
}

export function formatMoney(
  minor: number,
  currency: CurrencyCode,
  locale: string = 'ko-KR',
): string {
  const major = fromMinorUnits(minor, currency);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: MINOR_UNIT_EXPONENT[currency],
  }).format(major);
}

/** Integer-safe percentage. base * (pct/100), rounded to integer minor units. */
export function applyPercent(base: number, percentBp: number): number {
  // percentBp is in basis points × 100 → i.e. 3000 = 30.00%
  return Math.round((base * percentBp) / 10_000);
}

/** Sum of integers — guard against accidental float math. */
export function sumMinor(...values: readonly number[]): number {
  return values.reduce((acc, v) => acc + Math.trunc(v), 0);
}

/** Multiply minor amount by an integer quantity. */
export function multiplyMinor(unit: number, qty: number): number {
  return Math.trunc(unit) * Math.trunc(qty);
}
