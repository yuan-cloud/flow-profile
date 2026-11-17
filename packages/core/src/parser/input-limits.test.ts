import { describe, expect, it } from 'vitest';
import {
  assertInputLimits,
  INPUT_LIMITS,
  InputLimitError,
  parseInputJson,
} from '../schemas/flow.js';

describe('shared input limits', () => {
  it('shares a structural budget across JSON texts and cannot raise the policy ceiling', () => {
    const budget = { structuralUnitsRemaining: 1 };
    expect(parseInputJson('[]', budget)).toEqual([]);
    expect(budget.structuralUnitsRemaining).toBe(0);
    expect(() => parseInputJson('[]', budget)).toThrow('structure');
    for (const remaining of [2_000_001, Number.MAX_SAFE_INTEGER, Number.POSITIVE_INFINITY]) {
      expect(() => parseInputJson('[]', { structuralUnitsRemaining: remaining })).toThrow(
        'structure',
      );
    }
  });
  it('preserves quoted punctuation, escapes, Unicode and normal JSON values', () => {
    const value = {
      name: 'Safe label',
      code: '"[{}]:,\\"\\"',
      unicode: 'é 🙂 \u3000',
      nested: [true, null, 2, { label: 'Main' }],
    };
    expect(parseInputJson(JSON.stringify(value))).toEqual(value);
    expect(() => assertInputLimits(Object.freeze(value))).not.toThrow();
  });

  it('accepts exactly 64 container levels and rejects 65', () => {
    expect(() => parseInputJson(`${'['.repeat(64)}0${']'.repeat(64)}`)).not.toThrow();
    expect(() => parseInputJson(`${'['.repeat(65)}0${']'.repeat(65)}`)).toThrow(InputLimitError);
  });

  it('keeps the 50k collection boundary inclusive', () => {
    expect(() => assertInputLimits(Array(50_000).fill(null))).not.toThrow();
    expect(() => assertInputLimits(new Array(50_001))).toThrow('array-length');
  });

  it('bounds total work independently of each array length, including repeated references', () => {
    // Exactly 1000 + 1000*1999 = 2,000,000; repeated references still count each visit.
    const atLimit = Array(1_000).fill(Array(1_999).fill(null));
    expect(() => assertInputLimits(atLimit)).not.toThrow();
    const overLimit = [...atLimit];
    overLimit[0] = Array(2_000).fill(null);
    expect(() => assertInputLimits(overLimit)).toThrow('structure');
    const text = JSON.stringify(atLimit);
    expect(parseInputJson(text)).toEqual(atLimit);
    expect(() => parseInputJson(JSON.stringify(overLimit))).toThrow('structure');
  }, 20_000);

  it('bounds UTF-8 bytes rather than just JavaScript string length', () => {
    const text = `"${'€'.repeat(Math.floor(INPUT_LIMITS.maxBytes / 3) + 1)}"`;
    expect(text.length).toBeLessThan(INPUT_LIMITS.maxBytes);
    expect(Buffer.byteLength(text, 'utf8')).toBeGreaterThan(INPUT_LIMITS.maxBytes);
    expect(() => parseInputJson(text)).toThrow('bytes');
  });

  it('counts a surrogate pair as four UTF-8 bytes', () => {
    const text = `"${'x'.repeat(INPUT_LIMITS.maxBytes - 5)}🙂"`;
    expect(text.length).toBeLessThan(INPUT_LIMITS.maxBytes);
    expect(Buffer.byteLength(text, 'utf8')).toBe(INPUT_LIMITS.maxBytes + 1);
    expect(() => parseInputJson(text)).toThrow('bytes');
  });

  it('bounds total decoded text for callers supplying already parsed data', () => {
    expect(() => assertInputLimits({ payload: 'x'.repeat(INPUT_LIMITS.maxBytes + 1) })).toThrow(
      'text',
    );
  });

  it('does not invoke accessors or recurse indefinitely on cyclic data', () => {
    const value = {
      get payload() {
        throw new Error('accessor was invoked');
      },
    };
    expect(() => assertInputLimits(value)).toThrow('accessor');
    const cyclic: { child?: unknown } = {};
    cyclic.child = cyclic;
    expect(() => assertInputLimits(cyclic)).toThrow('depth');
  });

  it('keeps ordinary syntax failures distinct from resource refusals', () => {
    expect(() => parseInputJson('{bad JSON}')).toThrow(SyntaxError);
    expect(() => parseInputJson('['.repeat(65))).toThrow(InputLimitError);
    expect(new InputLimitError('depth').message).toBe('Input exceeds resource limits (depth).');
    expect(() => parseInputJson(null as unknown as string)).toThrow(SyntaxError);
  });
});
