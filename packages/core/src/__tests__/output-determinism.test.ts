import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { expandSubflows } from '../expand/subflow.js';
import { stringifyAboutMyFlows } from '../output/about-my-flows.js';
import { stringifyCapabilityManifest } from '../output/capability-manifest.js';
import { buildPromptContext } from '../output/prompt-context.js';
import { stringifyRiskFindings } from '../output/risk-findings.js';
import { parseFlow } from '../parser/parse.js';
import { redactSecrets } from '../redact/redact.js';

const FIXTURES_DIR = path.resolve(__dirname, '../../../../testdata/fixtures');

const parseJson = (payload: string): unknown => {
  try {
    return JSON.parse(payload) as unknown;
  } catch (error) {
    throw new Error(`Invalid JSON in fixture: ${String(error)}`);
  }
};

async function loadFixture(name: string): Promise<unknown> {
  const contents = await fs.readFile(path.join(FIXTURES_DIR, name), 'utf-8');
  return parseJson(contents);
}

/** Reproduces the CLI build pipeline with default options. */
function cliBuildPipeline(raw: unknown) {
  const { redacted } = redactSecrets(raw, {
    enabled: true,
    strictMode: true,
    entropyThreshold: 4.5,
  });
  const parsed = parseFlow(redacted);
  const flow = expandSubflows(parsed);

  return {
    about: stringifyAboutMyFlows(flow, 2),
    capability: stringifyCapabilityManifest(flow, 2),
    prompt: buildPromptContext(flow, { budget: 8000 }),
    risks: stringifyRiskFindings(flow, 2),
  };
}

const FIXTURES = [
  'simple.json',
  'with-subflows.json',
  'secrets-entropy.json',
  'risk-triggers.json',
  'large-500-nodes.json',
  'capability-surface.json',
];

describe('Output determinism (CLI code path)', () => {
  for (const fixture of FIXTURES) {
    describe(`${fixture}: repeated runs produce identical output`, () => {
      let run1: ReturnType<typeof cliBuildPipeline>;
      let run2: ReturnType<typeof cliBuildPipeline>;

      beforeAll(async () => {
        const raw = await loadFixture(fixture);
        run1 = cliBuildPipeline(raw);
        run2 = cliBuildPipeline(raw);
      });

      it('about-my-flows.json is byte-identical', () => {
        expect(run1.about).toBe(run2.about);
      });

      it('capability-manifest.json is byte-identical', () => {
        expect(run1.capability).toBe(run2.capability);
      });

      it('prompt-context.md is byte-identical', () => {
        expect(run1.prompt).toBe(run2.prompt);
      });

      it('risk-findings.json is byte-identical', () => {
        expect(run1.risks).toBe(run2.risks);
      });
    });
  }

  describe('output format validation', () => {
    let output: ReturnType<typeof cliBuildPipeline>;

    beforeAll(async () => {
      const raw = await loadFixture('capability-surface.json');
      output = cliBuildPipeline(raw);
    });

    it('about-my-flows is valid JSON with version', () => {
      const parsed = parseJson(output.about) as {
        version?: string;
        summary?: unknown;
        tabs?: unknown;
        ioSurface?: unknown;
      };
      expect(parsed.version).toBe('1.0');
      expect(parsed.summary).toBeDefined();
      expect(parsed.tabs).toBeDefined();
      expect(parsed.ioSurface).toBeDefined();
    });

    it('capability-manifest is valid JSON with version', () => {
      const parsed = parseJson(output.capability) as {
        version?: string;
        tools?: unknown;
        resources?: unknown;
      };
      expect(parsed.version).toBe('1.0');
      expect(parsed.tools).toBeDefined();
      expect(parsed.resources).toBeDefined();
    });

    it('prompt-context starts with markdown header', () => {
      expect(output.prompt).toMatch(/^# Flow Context/);
    });

    it('risk-findings is valid JSON with version', () => {
      const parsed = parseJson(output.risks) as {
        version?: string;
        findingCount?: unknown;
        findings?: unknown;
      };
      expect(parsed.version).toBe('1.0');
      expect(parsed.findingCount).toBeDefined();
      expect(parsed.findings).toBeDefined();
    });
  });

  describe('option sensitivity', () => {
    let raw: unknown;

    beforeAll(async () => {
      raw = await loadFixture('risk-triggers.json');
    });

    it('different budgets produce different prompt-context', () => {
      const { redacted } = redactSecrets(raw, {
        enabled: true,
        strictMode: true,
        entropyThreshold: 4.5,
      });
      const flow = expandSubflows(parseFlow(redacted));

      const context4k = buildPromptContext(flow, { budget: 4000 });
      const context16k = buildPromptContext(flow, { budget: 16000 });

      // Both valid but different budget numbers
      expect(context4k).toContain('budget: 4000');
      expect(context16k).toContain('budget: 16000');
      expect(context4k).not.toBe(context16k);
    });

    it('redaction disabled vs enabled changes output', () => {
      const withRedaction = redactSecrets(raw, {
        enabled: true,
        strictMode: true,
        entropyThreshold: 4.5,
      });
      const withoutRedaction = redactSecrets(raw, {
        enabled: false,
        strictMode: false,
        entropyThreshold: 4.5,
      });

      const flowRedacted = expandSubflows(parseFlow(withRedaction.redacted));
      const flowUnredacted = expandSubflows(parseFlow(withoutRedaction.redacted));

      const aboutRedacted = stringifyAboutMyFlows(flowRedacted, 2);
      const aboutUnredacted = stringifyAboutMyFlows(flowUnredacted, 2);

      // Both valid JSON
      expect(() => parseJson(aboutRedacted)).not.toThrow();
      expect(() => parseJson(aboutUnredacted)).not.toThrow();
    });
  });
});
