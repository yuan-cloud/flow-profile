import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseFlow } from '../parser/parse.js';
import { buildPromptContext } from './prompt-context.js';

const fixturePath = path.resolve(__dirname, '../../../../testdata/fixtures/simple.json');
const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');
const fixtureData = JSON.parse(fixtureContent) as unknown;

describe('prompt-context output', () => {
  it('renders deterministic markdown for simple fixture', () => {
    const flow = parseFlow(fixtureData);
    const markdown = buildPromptContext(flow, { budget: 1000 });

    expect(markdown).toContain('# Flow Context');
    expect(markdown).toContain('## Summary');
    expect(markdown).toContain('### Inputs');
    expect(markdown).toContain('inject');
    expect(markdown).toContain('### Outputs');
    expect(markdown).toContain('debug');
    expect(markdown).toContain('## Risk Findings');
  });
});
