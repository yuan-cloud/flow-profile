import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { performance } from 'node:perf_hooks';
import { beforeAll, describe, expect, it } from 'vitest';
import { expandSubflows } from '../expand/subflow.js';
import { stringifyAboutMyFlows } from '../output/about-my-flows.js';
import { stringifyCapabilityManifest } from '../output/capability-manifest.js';
import { buildPromptContext } from '../output/prompt-context.js';
import { stringifyRiskFindings } from '../output/risk-findings.js';
import { parseFlow } from '../parser/parse.js';
import { redactSecrets } from '../redact/redact.js';

const FIXTURE_NAME = 'large-500-nodes.json';
const PROMPT_BUDGET = 8000;
const REDACTION_OPTIONS = {
  enabled: true,
  strictMode: true,
  entropyThreshold: 4.5,
};
const MAX_DURATION_MS = 2000;

async function readFixture(name: string): Promise<unknown> {
  const fixturePath = path.resolve(__dirname, '../../../../testdata/fixtures', name);
  const content = await readFile(fixturePath, 'utf-8');
  try {
    return JSON.parse(content) as unknown;
  } catch (error) {
    throw new Error(`Invalid JSON fixture: ${fixturePath}`, {
      cause: error instanceof Error ? error : undefined,
    });
  }
}

function buildOutputs(input: unknown): void {
  const { redacted } = redactSecrets(input, REDACTION_OPTIONS);
  const parsed = parseFlow(redacted);
  const flow = expandSubflows(parsed);

  stringifyAboutMyFlows(flow, 2);
  stringifyCapabilityManifest(flow, 2);
  buildPromptContext(flow, { budget: PROMPT_BUDGET });
  stringifyRiskFindings(flow, 2);
}

describe('Performance harness', () => {
  let fixtureData: unknown;

  beforeAll(async () => {
    fixtureData = await readFixture(FIXTURE_NAME);
    buildOutputs(fixtureData);
  });

  it('processes a 500-node flow in under 2 seconds', () => {
    const start = performance.now();
    buildOutputs(fixtureData);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(MAX_DURATION_MS);
  });
});
