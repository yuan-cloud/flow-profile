import { describe, expect, it } from 'vitest';

import { buildPrompt } from './prompt';

describe('buildPrompt', () => {
  it('includes the system instruction', () => {
    const prompt = buildPrompt({ version: '0.1' });
    expect(prompt).toContain('vendor-neutral assistant');
    expect(prompt).toContain('STRICT JSON only');
  });

  it('includes the schema definition', () => {
    const prompt = buildPrompt({});
    expect(prompt).toContain('"suggestions"');
    expect(prompt).toContain('"evidenceRefs"');
    expect(prompt).toContain('"confidence"');
  });

  it('serializes the bundle as JSON', () => {
    const bundle = { version: '0.1', summary: { nodeCount: 5 } };
    const prompt = buildPrompt(bundle);
    expect(prompt).toContain('"version": "0.1"');
    expect(prompt).toContain('"nodeCount": 5');
  });

  it('handles empty bundle', () => {
    const prompt = buildPrompt({});
    expect(prompt).toContain('{}');
  });
});
