import { describe, expect, it } from 'vitest';
import { calculateEntropy } from './entropy.js';

describe('calculateEntropy', () => {
  it('returns 0 for a uniform string', () => {
    expect(calculateEntropy('aaaa')).toBe(0);
  });

  it('returns 1 for two equally likely symbols', () => {
    expect(calculateEntropy('ab')).toBeCloseTo(1, 5);
  });

  it('returns 2 for four equally likely symbols', () => {
    expect(calculateEntropy('abcd')).toBeCloseTo(2, 5);
  });
});
