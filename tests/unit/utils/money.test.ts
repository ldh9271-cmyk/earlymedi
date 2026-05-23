import { describe, expect, it } from 'vitest';
import {
  applyPercent,
  formatMoney,
  fromMinorUnits,
  multiplyMinor,
  sumMinor,
  toMinorUnits,
} from '@/lib/utils/money';

describe('money', () => {
  it('round-trips KRW as integer won', () => {
    expect(toMinorUnits(11_000_000, 'KRW')).toBe(11_000_000);
    expect(fromMinorUnits(11_000_000, 'KRW')).toBe(11_000_000);
  });

  it('round-trips USD as cents', () => {
    expect(toMinorUnits(99.99, 'USD')).toBe(9_999);
    expect(fromMinorUnits(9_999, 'USD')).toBe(99.99);
  });

  it('applies percent in basis-points × 100', () => {
    // 30.00% of ₩10,000,000 = ₩3,000,000
    expect(applyPercent(10_000_000, 3_000)).toBe(3_000_000);
    // 1.50% of ₩10,000,000 = ₩150,000
    expect(applyPercent(10_000_000, 150)).toBe(150_000);
  });

  it('sums integers safely', () => {
    expect(sumMinor(100, 200.7 as number, 300)).toBe(600); // truncation
  });

  it('multiplies as integers', () => {
    expect(multiplyMinor(1_000, 3)).toBe(3_000);
  });

  it('formats KRW with locale', () => {
    expect(formatMoney(11_000_000, 'KRW', 'ko-KR')).toContain('₩');
    expect(formatMoney(11_000_000, 'KRW', 'ko-KR')).toContain('11,000,000');
  });
});
