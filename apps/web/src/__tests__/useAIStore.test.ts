import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetAISuggestions } = vi.hoisted(() => ({
  mockGetAISuggestions: vi.fn(),
}));

vi.mock('@flow-profile/ai', () => ({
  createDefaultAdapters: () => ({
    mock: { name: 'mock' },
    openai: { name: 'openai' },
  }),
  getAISuggestions: mockGetAISuggestions,
}));

import { useAIStore } from '@/stores/ai';

const buildTestApiKey = () => String.fromCharCode(116, 101, 115, 116, 45, 107, 101, 121);

describe('useAIStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockGetAISuggestions.mockReset();
  });

  it('defaults to disabled state in Node env', () => {
    const store = useAIStore();
    expect(store.enabled).toBe(false);
    expect(store.provider).toBe('mock');
    expect(store.consented).toBe(false);
    expect(store.apiKey).toBe('');
    expect(store.model).toBe('');
    expect(store.rememberKey).toBe(false);
  });

  it('starts with empty results', () => {
    const store = useAIStore();
    expect(store.suggestions).toEqual([]);
    expect(store.evidenceRefs).toEqual([]);
    expect(store.promptUsed).toBe('');
    expect(store.rawResponse).toBe('');
    expect(store.errorMessage).toBeNull();
    expect(store.isLoading).toBe(false);
  });

  it('lists available adapter names', () => {
    const store = useAIStore();
    expect(store.adapterNames).toContain('mock');
    expect(store.adapterNames).toContain('openai');
  });

  it('canRequest is false when disabled', () => {
    const store = useAIStore();
    expect(store.canRequest).toBe(false);
  });

  it('canRequest is false when not consented', () => {
    const store = useAIStore();
    store.enabled = true;
    expect(store.canRequest).toBe(false);
  });

  it('canRequest is true for mock provider when enabled and consented', () => {
    const store = useAIStore();
    store.enabled = true;
    store.consented = true;
    store.provider = 'mock';
    expect(store.canRequest).toBe(true);
  });

  it('canRequest requires apiKey for non-mock providers', () => {
    const store = useAIStore();
    store.enabled = true;
    store.consented = true;
    store.provider = 'openai';
    expect(store.canRequest).toBe(false);

    store.apiKey = buildTestApiKey();
    expect(store.canRequest).toBe(true);
  });

  it('clearResults resets all result state', () => {
    const store = useAIStore();
    store.suggestions = [
      { type: 'explanation', content: 'test', confidence: 'high', references: [] },
    ] as never;
    store.evidenceRefs = ['ref1'] as never;
    store.promptUsed = 'prompt';
    store.rawResponse = 'response';
    store.errorMessage = 'error';

    store.clearResults();

    expect(store.suggestions).toEqual([]);
    expect(store.evidenceRefs).toEqual([]);
    expect(store.promptUsed).toBe('');
    expect(store.rawResponse).toBe('');
    expect(store.errorMessage).toBeNull();
  });

  it('requestSuggestions sets error when bundle is null', async () => {
    const store = useAIStore();
    await store.requestSuggestions(null);
    expect(store.errorMessage).toBe('No bundle available yet.');
    expect(mockGetAISuggestions).not.toHaveBeenCalled();
  });

  it('requestSuggestions sets error when canRequest is false', async () => {
    const store = useAIStore();
    await store.requestSuggestions({ version: '0.1' });
    expect(store.errorMessage).toBe('AI suggestions are disabled or missing consent/api key.');
    expect(mockGetAISuggestions).not.toHaveBeenCalled();
  });

  it('requestSuggestions populates results on success', async () => {
    const store = useAIStore();
    store.enabled = true;
    store.consented = true;
    store.provider = 'mock';

    mockGetAISuggestions.mockResolvedValue({
      suggestions: [
        { type: 'explanation', content: 'test insight', confidence: 'high', references: [] },
      ],
      evidenceRefs: ['node-1'],
      promptUsed: 'prompt text',
      rawResponse: 'raw output',
    });

    await store.requestSuggestions({ version: '0.1' });

    expect(store.suggestions).toHaveLength(1);
    expect(store.suggestions[0].content).toBe('test insight');
    expect(store.evidenceRefs).toEqual(['node-1']);
    expect(store.promptUsed).toBe('prompt text');
    expect(store.rawResponse).toBe('raw output');
    expect(store.isLoading).toBe(false);
    expect(store.errorMessage).toBeNull();
  });

  it('requestSuggestions sets errorMessage on adapter error', async () => {
    const store = useAIStore();
    store.enabled = true;
    store.consented = true;
    store.provider = 'mock';

    mockGetAISuggestions.mockRejectedValue(new Error('Network failure'));

    await store.requestSuggestions({ version: '0.1' });

    expect(store.errorMessage).toBe('Network failure');
    expect(store.isLoading).toBe(false);
  });

  it('requestSuggestions handles non-Error throw gracefully', async () => {
    const store = useAIStore();
    store.enabled = true;
    store.consented = true;
    store.provider = 'mock';

    mockGetAISuggestions.mockRejectedValue('string error');

    await store.requestSuggestions({ version: '0.1' });

    expect(store.errorMessage).toBe('An unexpected error occurred.');
    expect(store.isLoading).toBe(false);
  });

  it('requestSuggestions sets isLoading during request', async () => {
    const store = useAIStore();
    store.enabled = true;
    store.consented = true;
    store.provider = 'mock';

    let resolve: (value: unknown) => void = () => {};
    const pending = new Promise((r) => {
      resolve = r;
    });
    mockGetAISuggestions.mockReturnValue(pending);

    const promise = store.requestSuggestions({ version: '0.1' });
    expect(store.isLoading).toBe(true);

    resolve({
      suggestions: [],
      evidenceRefs: [],
      promptUsed: '',
      rawResponse: '',
    });
    await promise;
    expect(store.isLoading).toBe(false);
  });

  it('requestSuggestions sets errorMessage when empty suggestions with rawResponse', async () => {
    const store = useAIStore();
    store.enabled = true;
    store.consented = true;
    store.provider = 'mock';

    mockGetAISuggestions.mockResolvedValue({
      suggestions: [],
      evidenceRefs: [],
      promptUsed: 'prompt',
      rawResponse: 'Model returned unparseable output',
    });

    await store.requestSuggestions({ version: '0.1' });

    expect(store.suggestions).toEqual([]);
    expect(store.errorMessage).toBe('Model returned unparseable output');
  });
});
