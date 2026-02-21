import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { expandSubflows } from '../expand/subflow.js';
import { stringifyAboutMyFlows } from '../output/about-my-flows.js';
import { stringifyCapabilityManifest } from '../output/capability-manifest.js';
import { buildPromptContext } from '../output/prompt-context.js';
import { stringifyRiskFindings } from '../output/risk-findings.js';
import { parseFlow } from '../parser/parse.js';
import { redactSecrets } from '../redact/redact.js';

type DeterminismOutput = {
  about: string;
  capability: string;
  prompt: string;
  risks: string;
};

const FIXTURES = [
  'simple.json',
  'with-subflows.json',
  'secrets-entropy.json',
  'risk-triggers.json',
  'large-500-nodes.json',
  'capability-surface.json',
];

const REDACTION_OPTIONS = {
  enabled: true,
  strictMode: true,
  entropyThreshold: 4.5,
};

const PROMPT_BUDGET = 8000;

function readFixture(name: string): unknown {
  const fixturePath = path.resolve(__dirname, '../../../../testdata/fixtures', name);
  const content = fs.readFileSync(fixturePath, 'utf-8');
  return JSON.parse(content) as unknown;
}

function buildOutputs(input: unknown): DeterminismOutput {
  const { redacted } = redactSecrets(input, REDACTION_OPTIONS);
  const parsed = parseFlow(redacted);
  const flow = expandSubflows(parsed);

  return {
    about: stringifyAboutMyFlows(flow, 2),
    capability: stringifyCapabilityManifest(flow, 2),
    prompt: buildPromptContext(flow, { budget: PROMPT_BUDGET }),
    risks: stringifyRiskFindings(flow, 2),
  };
}

describe('Determinism harness', () => {
  for (const fixture of FIXTURES) {
    it(`produces identical output for ${fixture}`, () => {
      const input = readFixture(fixture);
      const outputA = buildOutputs(input);
      const outputB = buildOutputs(input);

      expect(outputA).toEqual(outputB);
    });

    it(`matches snapshot for ${fixture}`, () => {
      const input = readFixture(fixture);
      const output = buildOutputs(input);

      expect(output.about).toMatchSnapshot();
      expect(output.capability).toMatchSnapshot();
      expect(output.prompt).toMatchSnapshot();
      expect(output.risks).toMatchSnapshot();
    });
  }
});
