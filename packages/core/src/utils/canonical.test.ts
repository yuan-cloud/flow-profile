import { describe, expect, it } from 'vitest';
import { canonicalStringify, sortKeys } from './canonical.js';

describe('canonicalStringify', () => {
  it('produces identical output for different key orders', () => {
    const a = { z: 1, a: 2, m: { y: 3, b: 4 } };
    const b = { a: 2, m: { b: 4, y: 3 }, z: 1 };

    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
  });

  it('preserves array ordering while sorting nested objects', () => {
    const value = [
      { b: 2, a: 1 },
      { d: 4, c: 3 },
    ];
    const result = sortKeys(value, new WeakSet<object>());

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([
      { a: 1, b: 2 },
      { c: 3, d: 4 },
    ]);
  });

  it('stringifies Date values deterministically', () => {
    const date = new Date('2025-01-02T03:04:05.000Z');
    const result = canonicalStringify({ when: date }, { indent: 0 });

    expect(result).toContain('2025-01-02T03:04:05.000Z');
  });

  it('throws on circular references', () => {
    const value: Record<string, unknown> = { a: 1 };
    value.self = value;

    expect(() => canonicalStringify(value)).toThrow('circular');
  });
});
