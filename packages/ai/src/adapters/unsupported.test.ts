import { describe, expect, it } from 'vitest';

import { UnsupportedAdapter } from './unsupported';

describe('UnsupportedAdapter', () => {
  it('stores name and message', () => {
    const adapter = new UnsupportedAdapter('anthropic', 'Not implemented yet.');
    expect(adapter.name).toBe('anthropic');
  });

  it('throws on generateSuggestions with name and message', async () => {
    const adapter = new UnsupportedAdapter('ollama', 'Coming soon.');
    await expect(adapter.generateSuggestions({}, {})).rejects.toThrow(
      'ollama adapter unavailable: Coming soon.',
    );
  });

  it('placeholder() creates an instance', () => {
    const adapter = UnsupportedAdapter.placeholder('test', 'reason');
    expect(adapter).toBeInstanceOf(UnsupportedAdapter);
    expect(adapter.name).toBe('test');
  });

  it('placeholder instance throws correctly', async () => {
    const adapter = UnsupportedAdapter.placeholder('anthropic', 'Not implemented yet.');
    await expect(adapter.generateSuggestions({}, {})).rejects.toThrow(
      'anthropic adapter unavailable: Not implemented yet.',
    );
  });
});
