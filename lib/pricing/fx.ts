/**
 * FX snapshot + conversion.
 *
 * Spec rule: every monetary case captures the FX rates *at quote time* so
 * later exchange-rate moves don't change the agency's commission base or
 * cause disputes with the hospital. A chart's `fxSnapshotJson` is the
 * authoritative reference until finalize; refunds use the same snapshot.
 *
 * KRW is the canonical base. All rates are stored as `KRW per 1 unit of FOO`.
 * USD 1 = ₩1350 → `rateKrwPer.USD = 1350`. Integer KRW arithmetic everywhere.
 */

export type FxSnapshot = {
  takenAt: string; // ISO timestamp
  baseCurrency: 'KRW';
  /** KRW per 1 unit of the target currency. */
  rateKrwPer: Record<string, number>;
  /** Optional provenance — which provider returned this rate set. */
  source?: 'exchangerate-api' | 'mock' | 'manual';
};

/** Convert `amount` in `from` into KRW using the snapshot. */
export function toKrw(amount: number, from: string, snapshot: FxSnapshot): number {
  if (from === 'KRW') return Math.round(amount);
  const rate = snapshot.rateKrwPer[from];
  if (!rate) throw new Error(`fx_rate_missing:${from}`);
  return Math.round(amount * rate);
}

/** Convert `amountKrw` into the target currency's minor unit. */
export function fromKrw(amountKrw: number, to: string, snapshot: FxSnapshot): number {
  if (to === 'KRW') return Math.round(amountKrw);
  const rate = snapshot.rateKrwPer[to];
  if (!rate || rate <= 0) throw new Error(`fx_rate_missing:${to}`);
  return Math.round(amountKrw / rate);
}

/**
 * Reasonable defaults for mock/dev environments — the real Phase 6 wires this
 * up to a paid provider via `FX_PROVIDER` env and writes to `fx_rate_snapshots`.
 * The numbers below are May 2026 ballpark figures, NOT for trading use.
 */
export const MOCK_FX_SNAPSHOT: FxSnapshot = {
  takenAt: '2026-05-23T00:00:00Z',
  baseCurrency: 'KRW',
  rateKrwPer: {
    USD: 1_350,
    JPY: 9,
    CNY: 186,
    EUR: 1_460,
    RUB: 16,
    VND: 0.054,
    THB: 37,
    AED: 367,
    GBP: 1_700,
    AUD: 880,
    SGD: 1_000,
  },
  source: 'mock',
};

/** Compute a +/− variance vs baseline (in basis points). Useful for FX P&L. */
export function fxDeltaBp(actualRate: number, baselineRate: number): number {
  if (baselineRate <= 0) return 0;
  return Math.round(((actualRate - baselineRate) / baselineRate) * 10_000);
}
