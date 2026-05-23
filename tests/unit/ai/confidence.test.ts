import { describe, expect, it } from 'vitest';
import { classifyOverall, colorFor, AUTO_APPLY_THRESHOLD_BP, REVIEW_THRESHOLD_BP } from '@/lib/ai/extraction/confidence';

describe('confidence classification', () => {
  it('uses 9000bp / 7000bp breakpoints', () => {
    expect(AUTO_APPLY_THRESHOLD_BP).toBe(9000);
    expect(REVIEW_THRESHOLD_BP).toBe(7000);
    expect(colorFor(9500)).toBe('green');
    expect(colorFor(9000)).toBe('green');
    expect(colorFor(8999)).toBe('amber');
    expect(colorFor(7000)).toBe('amber');
    expect(colorFor(6999)).toBe('red');
    expect(colorFor(0)).toBe('red');
  });

  it('overall confidence is the minimum across key fields', () => {
    const r = classifyOverall({ a: 9500, b: 8200, c: 9700, d: 10000 }, ['a', 'b', 'c']);
    expect(r.overallBp).toBe(8200);
    expect(r.color).toBe('amber');
  });

  it('returns 0 when no key fields present', () => {
    expect(classifyOverall({}, ['x']).overallBp).toBe(0);
  });
});
