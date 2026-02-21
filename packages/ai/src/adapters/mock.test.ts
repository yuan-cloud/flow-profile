import { describe, expect, it } from 'vitest';

import { MockAdapter } from './mock';

describe('MockAdapter', () => {
  const adapter = new MockAdapter();
  const bundle = { version: '0.1', summary: { nodeCount: 3 } };

  it('has name "mock"', () => {
    expect(adapter.name).toBe('mock');
  });

  it('returns two suggestions', async () => {
    const result = await adapter.generateSuggestions(bundle, {});
    expect(result.suggestions).toHaveLength(2);
  });

  it('returns explanation and next-step types', async () => {
    const result = await adapter.generateSuggestions(bundle, {});
    expect(result.suggestions[0].type).toBe('explanation');
    expect(result.suggestions[1].type).toBe('next-step');
  });

  it('uses bundle keys as references', async () => {
    const result = await adapter.generateSuggestions(bundle, {});
    expect(result.suggestions[0].references).toEqual(['version', 'summary']);
  });

  it('limits references to first 2 keys', async () => {
    const largeBundle = { a: 1, b: 2, c: 3, d: 4 };
    const result = await adapter.generateSuggestions(largeBundle, {});
    expect(result.suggestions[0].references).toEqual(['a', 'b']);
  });

  it('includes promptUsed from buildPrompt', async () => {
    const result = await adapter.generateSuggestions(bundle, {});
    expect(result.promptUsed).toContain('vendor-neutral assistant');
    expect(result.promptUsed).toContain('"version": "0.1"');
  });

  it('includes rawResponse as JSON string', async () => {
    const result = await adapter.generateSuggestions(bundle, {});
    const parsed = JSON.parse(result.rawResponse);
    expect(parsed.suggestions).toHaveLength(2);
  });

  it('returns low confidence for all suggestions', async () => {
    const result = await adapter.generateSuggestions(bundle, {});
    for (const s of result.suggestions) {
      expect(s.confidence).toBe('low');
    }
  });
});
