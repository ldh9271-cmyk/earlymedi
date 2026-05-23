import { describe, expect, it } from 'vitest';
import { __testing } from '@/lib/ai/usage-logger';

describe('AI usage cost estimation', () => {
  it('prices Gemini 2.5 Pro at known rates', () => {
    // 1M input + 500K output @ 1700/M + 6800/M = 1700 + 3400 = 5100 KRW
    expect(__testing.estimateCostKrw('gemini-2.5-pro', 1_000_000, 500_000)).toBe(5_100);
  });
  it('prices Claude Opus 4.7 at premium rates', () => {
    // 100K input + 50K output @ 20400/M + 102000/M = 2040 + 5100 = 7140 KRW (rounded up)
    expect(__testing.estimateCostKrw('claude-opus-4-7', 100_000, 50_000)).toBe(7_140);
  });
  it('returns 0 for unknown models', () => {
    expect(__testing.estimateCostKrw('unknown-model', 1_000_000, 1_000_000)).toBe(0);
  });
});
