import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OpenAIAdapter } from './openai';

const adapter = new OpenAIAdapter();
const bundle = { version: '0.1' };

const mockFetch = vi.fn();
const buildTestApiKey = () => String.fromCharCode(116, 101, 115, 116);

const parseJson = (payload: string) => {
  try {
    return JSON.parse(payload) as unknown;
  } catch (error) {
    throw new Error(`Invalid JSON in test payload: ${String(error)}`);
  }
};

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
});

const okResponse = (content: string) => ({
  ok: true,
  json: async () => ({
    choices: [{ message: { content } }],
  }),
});

const errorResponse = (status: number, text: string) => ({
  ok: false,
  status,
  text: async () => text,
});

describe('OpenAIAdapter', () => {
  it('has name "openai"', () => {
    expect(adapter.name).toBe('openai');
  });

  it('throws when no apiKey provided', async () => {
    await expect(adapter.generateSuggestions(bundle, {})).rejects.toThrow(
      'OpenAI API key is required.',
    );
  });

  it('sends correct request to OpenAI API', async () => {
    mockFetch.mockResolvedValue(okResponse('{}'));
    const apiKey = buildTestApiKey();
    await adapter.generateSuggestions(bundle, { apiKey });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        }),
      }),
    );
  });

  it('uses custom baseUrl when provided', async () => {
    mockFetch.mockResolvedValue(okResponse('{}'));
    await adapter.generateSuggestions(bundle, {
      apiKey: buildTestApiKey(),
      baseUrl: 'https://custom.api/v1/completions',
    });

    expect(mockFetch).toHaveBeenCalledWith('https://custom.api/v1/completions', expect.any(Object));
  });

  it('uses custom model when provided', async () => {
    mockFetch.mockResolvedValue(okResponse('{}'));
    await adapter.generateSuggestions(bundle, {
      apiKey: buildTestApiKey(),
      model: 'gpt-4',
    });

    const body = parseJson(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('gpt-4');
  });

  it('defaults to gpt-4o-mini model', async () => {
    mockFetch.mockResolvedValue(okResponse('{}'));
    await adapter.generateSuggestions(bundle, { apiKey: buildTestApiKey() });

    const body = parseJson(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('gpt-4o-mini');
  });

  it('parses valid JSON response into suggestions', async () => {
    const content = JSON.stringify({
      suggestions: [
        { type: 'explanation', content: 'insight', confidence: 'high', references: ['ref1'] },
      ],
      evidenceRefs: ['node-1'],
    });
    mockFetch.mockResolvedValue(okResponse(content));

    const result = await adapter.generateSuggestions(bundle, { apiKey: buildTestApiKey() });

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].content).toBe('insight');
    expect(result.evidenceRefs).toEqual(['node-1']);
  });

  it('falls back to raw content when response is not valid JSON', async () => {
    mockFetch.mockResolvedValue(okResponse('This is plain text advice.'));

    const result = await adapter.generateSuggestions(bundle, { apiKey: buildTestApiKey() });

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].type).toBe('explanation');
    expect(result.suggestions[0].content).toBe('This is plain text advice.');
    expect(result.suggestions[0].confidence).toBe('low');
  });

  it('handles empty choices array', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    });

    const result = await adapter.generateSuggestions(bundle, { apiKey: buildTestApiKey() });

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].content).toBe('No suggestions returned.');
  });

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValue(errorResponse(401, 'Unauthorized'));
    const badKey = `${buildTestApiKey()}-bad`;

    await expect(adapter.generateSuggestions(bundle, { apiKey: badKey })).rejects.toThrow(
      'OpenAI error 401: Unauthorized',
    );
  });

  it('includes promptUsed in result', async () => {
    mockFetch.mockResolvedValue(okResponse('{}'));
    const result = await adapter.generateSuggestions(bundle, { apiKey: buildTestApiKey() });
    expect(result.promptUsed).toContain('vendor-neutral assistant');
  });

  it('includes rawResponse as formatted JSON', async () => {
    mockFetch.mockResolvedValue(okResponse('{}'));
    const result = await adapter.generateSuggestions(bundle, { apiKey: buildTestApiKey() });
    const raw = parseJson(result.rawResponse);
    expect(raw.choices).toBeDefined();
  });
});
