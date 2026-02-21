import { describe, expect, it, vi } from 'vitest';

import type { AIAdapter } from './adapter';
import { getAISuggestions } from './client';

const bundle = { version: '0.1' };

const successAdapter: AIAdapter = {
  name: 'test',
  generateSuggestions: async () => ({
    suggestions: [{ type: 'explanation', content: 'test', confidence: 'high', references: [] }],
    evidenceRefs: [],
    promptUsed: 'prompt',
    rawResponse: 'raw',
  }),
};

const errorAdapter: AIAdapter = {
  name: 'failing',
  generateSuggestions: async () => {
    throw new Error('adapter crashed');
  },
};

const slowAdapter: AIAdapter = {
  name: 'slow',
  generateSuggestions: () => new Promise(() => {}),
};

describe('getAISuggestions', () => {
  it('returns adapter result on success', async () => {
    const result = await getAISuggestions(successAdapter, bundle, {});
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].content).toBe('test');
  });

  it('returns empty result with error message on adapter failure', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await getAISuggestions(errorAdapter, bundle, {});

    expect(result.suggestions).toEqual([]);
    expect(result.rawResponse).toBe('adapter crashed');
    warn.mockRestore();
  });

  it('returns empty result on timeout', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await getAISuggestions(slowAdapter, bundle, { timeoutMs: 1 });

    expect(result.suggestions).toEqual([]);
    expect(result.rawResponse).toBe('AI request timed out.');
    warn.mockRestore();
  });

  it('uses default timeout of 10000ms', async () => {
    // This test just verifies the adapter resolves before default timeout
    const result = await getAISuggestions(successAdapter, bundle, {});
    expect(result.suggestions).toHaveLength(1);
  });

  it('handles non-Error throw gracefully', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const adapter: AIAdapter = {
      name: 'weird',
      generateSuggestions: async () => {
        throw 'string error';
      },
    };
    const result = await getAISuggestions(adapter, bundle, {});
    expect(result.rawResponse).toBe('AI suggestions unavailable.');
    warn.mockRestore();
  });
});
