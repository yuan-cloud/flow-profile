import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { buildTokenBudget } from '../budget/tokens.js';
import { buildCapabilityManifest } from '../capability/manifest.js';
import { categorizeFlow, categorizeNodes } from '../categorize/categorize.js';
import { expandSubflows } from '../expand/subflow.js';
import { buildAboutMyFlows } from '../output/about-my-flows.js';
import { buildCapabilityManifestOutput } from '../output/capability-manifest.js';
import { buildPromptContext } from '../output/prompt-context.js';
import { buildRiskFindingsFromFlow } from '../output/risk-findings.js';
import { buildSupportBundle } from '../output/support-bundle.js';
import { parseFlow } from '../parser/parse.js';
import { redactSecrets } from '../redact/redact.js';
import { detectRisks } from '../risks/detect.js';

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

function pipeline(raw: unknown) {
  const { redacted, report } = redactSecrets(raw, {
    enabled: true,
    strictMode: true,
    entropyThreshold: 4.5,
  });
  const parsed = parseFlow(redacted);
  const expanded = expandSubflows(parsed);
  return { redacted, report, parsed, expanded };
}

describe('Cross-package pipeline integration', () => {
  const FIXTURES = [
    'simple.json',
    'with-subflows.json',
    'secrets-entropy.json',
    'risk-triggers.json',
    'large-500-nodes.json',
    'capability-surface.json',
  ];

  describe('all fixtures parse and expand without error', () => {
    for (const fixture of FIXTURES) {
      it(`processes ${fixture} through full pipeline`, async () => {
        const raw = await loadFixture(fixture);
        const { parsed, expanded } = pipeline(raw);

        // parsed flow has structural integrity
        expect(parsed.tabs.length).toBeGreaterThanOrEqual(1);
        expect(parsed.nodes.length).toBeGreaterThanOrEqual(1);
        expect(parsed.nodesById.size).toBe(parsed.nodes.length + parsed.configNodes.length);

        // expansion preserves tabs and subflowDefs
        expect(expanded.tabs).toEqual(parsed.tabs);
        expect(expanded.subflowDefs).toEqual(parsed.subflowDefs);
      });
    }
  });

  describe('simple.json — minimal inject→debug flow', () => {
    let parsed: ReturnType<typeof pipeline>['parsed'];
    let expanded: ReturnType<typeof pipeline>['expanded'];

    beforeAll(async () => {
      const raw = await loadFixture('simple.json');
      ({ parsed, expanded } = pipeline(raw));
    });

    it('has 1 tab, 3 nodes, 1 edge', () => {
      expect(parsed.tabs).toHaveLength(1);
      expect(parsed.tabs[0].label).toBe('Simple Flow');
      expect(parsed.nodes).toHaveLength(3);
      expect(parsed.edges).toHaveLength(1);
    });

    it('edge connects inject to debug', () => {
      const edge = parsed.edges[0];
      expect(edge.source).toBe('inject-simple');
      expect(edge.target).toBe('debug-simple');
    });

    it('categorizes nodes correctly', () => {
      const summary = categorizeFlow(parsed);
      expect(summary.counts.input).toBe(1); // inject
      expect(summary.counts.output).toBe(1); // debug
      expect(summary.counts.logic).toBe(1); // comment
    });

    it('has no subflows to expand', () => {
      expect(expanded.nodes.length).toBe(parsed.nodes.length);
      expect(expanded.expansionMetadata.expandedSubflows).toHaveLength(0);
    });

    it('produces valid about-my-flows output', () => {
      const about = buildAboutMyFlows(expanded);
      expect(about.version).toBe('1.0');
      expect(about.summary.nodeCount).toBe(3);
      expect(about.summary.edgeCount).toBe(1);
      expect(about.ioSurface.inputs.length).toBeGreaterThan(0);
      expect(about.ioSurface.outputs.length).toBeGreaterThan(0);
    });

    it('produces valid prompt context', () => {
      const context = buildPromptContext(expanded, { budget: 8000 });
      expect(context).toContain('# Flow Context');
      expect(context).toContain('Simple Flow');
      expect(context).toContain('Token status:');
    });
  });

  describe('risk-triggers.json — risks detected across pipeline', () => {
    let parsed: ReturnType<typeof pipeline>['parsed'];
    let expanded: ReturnType<typeof pipeline>['expanded'];

    beforeAll(async () => {
      const raw = await loadFixture('risk-triggers.json');
      ({ parsed, expanded } = pipeline(raw));
    });

    it('parses 8 nodes and multiple edges', () => {
      expect(parsed.nodes).toHaveLength(8);
      expect(parsed.edges.length).toBeGreaterThan(0);
    });

    it('detects risks in the expanded flow', () => {
      const result = detectRisks(expanded);
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.rulesExecuted.length).toBeGreaterThan(0);
      expect(result.metadata.nodesAnalyzed).toBe(expanded.nodes.length);
    });

    it('finds injection-prone template node', () => {
      const result = detectRisks(expanded);
      const injectionFindings = result.findings.filter((f) => f.id === 'RISK_INJECTION_PRONE');
      expect(injectionFindings.length).toBeGreaterThan(0);
    });

    it('finds infinite loop risks', () => {
      const result = detectRisks(expanded);
      const loopFindings = result.findings.filter((f) => f.id === 'RISK_INFINITE_LOOP');
      expect(loopFindings.length).toBeGreaterThan(0);
    });

    it('risk findings appear in prompt context', () => {
      const context = buildPromptContext(expanded);
      expect(context).toContain('## Risk Findings');
      // Should have at least one risk listed
      expect(context).not.toContain('- None');
    });

    it('risk findings output has correct structure', () => {
      const output = buildRiskFindingsFromFlow(expanded);
      expect(output.version).toBe('1.0');
      expect(output.findingCount).toBeGreaterThan(0);
      expect(output.metadata.rulesRun.length).toBeGreaterThan(0);
      for (const finding of output.findings) {
        expect(finding).toHaveProperty('id');
        expect(finding).toHaveProperty('title');
        expect(finding).toHaveProperty('severity');
        expect(finding).toHaveProperty('affectedNodes');
        expect(finding.affectedNodes.length).toBeGreaterThan(0);
      }
    });

    it('categorizes HTTP in/out and exec correctly', () => {
      const categorized = categorizeNodes(parsed);
      const httpIn = categorized.find((n) => n.id === 'http-in');
      const httpResponse = categorized.find((n) => n.id === 'http-response');
      const exec = categorized.find((n) => n.id === 'exec-node');

      expect(httpIn?.category).toBe('input');
      expect(httpResponse?.category).toBe('output');
      expect(exec?.category).toBe('output');
    });
  });

  describe('capability-surface.json — capability extraction', () => {
    let expanded: ReturnType<typeof pipeline>['expanded'];

    beforeAll(async () => {
      const raw = await loadFixture('capability-surface.json');
      ({ expanded } = pipeline(raw));
    });

    it('extracts tools and resources', () => {
      const manifest = buildCapabilityManifest(expanded);
      expect(manifest.tools.length).toBeGreaterThan(0);
      expect(manifest.resources.length).toBeGreaterThan(0);
    });

    it('finds HTTP endpoint as resource', () => {
      const manifest = buildCapabilityManifest(expanded);
      const httpResource = manifest.resources.find((r) => r.name === 'HTTP endpoint');
      expect(httpResource).toBeDefined();
      expect(httpResource?.description).toContain('/api/cap');
    });

    it('finds MQTT subscription as resource', () => {
      const manifest = buildCapabilityManifest(expanded);
      const mqtt = manifest.resources.find((r) => r.name === 'MQTT subscription');
      expect(mqtt).toBeDefined();
      expect(mqtt?.description).toContain('sensors/temperature');
    });

    it('finds exec tool', () => {
      const manifest = buildCapabilityManifest(expanded);
      const exec = manifest.tools.find((t) => t.name === 'Execute system command');
      expect(exec).toBeDefined();
      expect(exec?.description).toContain('uptime');
    });

    it('finds file write tool', () => {
      const manifest = buildCapabilityManifest(expanded);
      const fileWrite = manifest.tools.find((t) => t.name === 'Write to file');
      expect(fileWrite).toBeDefined();
      expect(fileWrite?.description).toContain('output.txt');
    });

    it('capability manifest output includes version', () => {
      const output = buildCapabilityManifestOutput(expanded);
      expect(output.version).toBe('1.0');
      expect(output.metadata.totalNodes).toBeGreaterThan(0);
    });

    it('capabilities appear in prompt context', () => {
      const context = buildPromptContext(expanded);
      expect(context).toContain('## Capabilities Summary');
      expect(context).toContain('Tools (actions)');
      expect(context).toContain('Resources (data sources)');
    });
  });

  describe('secrets-entropy.json — redaction pipeline', () => {
    let redacted: ReturnType<typeof pipeline>['redacted'];
    let report: ReturnType<typeof pipeline>['report'];
    let parsed: ReturnType<typeof pipeline>['parsed'];

    beforeAll(async () => {
      const raw = await loadFixture('secrets-entropy.json');
      ({ redacted, report, parsed } = pipeline(raw));
    });

    it('redacts at least one value', () => {
      expect(report.totalRedacted).toBeGreaterThan(0);
    });

    it('replaces secrets with masks in redacted output', () => {
      const redactedStr = JSON.stringify(redacted);
      for (const entry of report.entries) {
        expect(redactedStr).toContain(entry.maskAssigned);
      }
    });

    it('redacted data still parses correctly', () => {
      expect(parsed.tabs.length).toBeGreaterThanOrEqual(1);
      expect(parsed.nodes.length).toBeGreaterThan(0);
    });

    it('redaction report entries have required fields', () => {
      for (const entry of report.entries) {
        expect(entry.fieldPath).toBeTruthy();
        expect(entry.reason).toBeTruthy();
        expect(entry.originalLength).toBeGreaterThan(0);
        expect(entry.maskAssigned).toMatch(/^SECRET_/);
      }
    });
  });

  describe('with-subflows.json — subflow expansion', () => {
    let parsed: ReturnType<typeof pipeline>['parsed'];
    let expanded: ReturnType<typeof pipeline>['expanded'];

    beforeAll(async () => {
      const raw = await loadFixture('with-subflows.json');
      ({ parsed, expanded } = pipeline(raw));
    });

    it('has subflow definitions', () => {
      expect(parsed.subflowDefs.length).toBeGreaterThan(0);
    });

    it('expands subflow instances', () => {
      expect(expanded.expansionMetadata.expandedSubflows.length).toBeGreaterThan(0);
    });

    it('expanded nodes differ from parsed nodes', () => {
      // Subflow instances are replaced by their internal nodes;
      // count may stay the same but node identities change
      const parsedIds = new Set(parsed.nodes.map((n) => n.id));
      const expandedIds = new Set(expanded.nodes.map((n) => n.id));
      // At least one new namespaced ID should appear
      const newIds = [...expandedIds].filter((id) => !parsedIds.has(id));
      expect(newIds.length).toBeGreaterThan(0);
    });

    it('all outputs remain valid after expansion', () => {
      const about = buildAboutMyFlows(expanded);
      const context = buildPromptContext(expanded);
      const risks = detectRisks(expanded);

      expect(about.version).toBe('1.0');
      expect(context).toContain('# Flow Context');
      expect(risks.metadata.nodesAnalyzed).toBe(expanded.nodes.length);
    });
  });

  describe('large-500-nodes.json — scale and budget', () => {
    let expanded: ReturnType<typeof pipeline>['expanded'];

    beforeAll(async () => {
      const raw = await loadFixture('large-500-nodes.json');
      ({ expanded } = pipeline(raw));
    });

    it('handles large flows without error', () => {
      expect(expanded.nodes.length).toBeGreaterThanOrEqual(100);
    });

    it('token budget reports appropriate status', () => {
      const context = buildPromptContext(expanded, { budget: 8000 });
      // Large flow should produce substantial context
      expect(context.length).toBeGreaterThan(1000);
      expect(context).toContain('Token estimate:');
    });

    it('token budget breakdown is consistent', () => {
      const sections = {
        summary: 'test summary',
        nodeDescriptions: 'a'.repeat(2000),
        functionCode: 'b'.repeat(3000),
        riskFindings: 'c'.repeat(1000),
      };
      const budget = buildTokenBudget(sections, 8000);

      expect(budget.current).toBe(
        budget.breakdown.summary +
          budget.breakdown.nodeDescriptions +
          budget.breakdown.functionCode +
          budget.breakdown.riskFindings,
      );
      expect(budget.budget).toBe(8000);
      expect(['ok', 'warning', 'over']).toContain(budget.status);
    });
  });

  describe('support bundle generation', () => {
    let expanded: ReturnType<typeof pipeline>['expanded'];

    beforeAll(async () => {
      const raw = await loadFixture('capability-surface.json');
      ({ expanded } = pipeline(raw));
    });

    it('builds complete support bundle', () => {
      const bundle = buildSupportBundle(expanded);
      expect(bundle.zipBytes).toBeInstanceOf(Uint8Array);
      expect(bundle.zipBytes.length).toBeGreaterThan(0);
    });

    it('bundle manifest has expected artifacts', () => {
      const bundle = buildSupportBundle(expanded);
      const names = bundle.artifacts.map((a) => a.name);
      expect(names).toContain('about-my-flows.json');
      expect(names).toContain('capability-manifest.json');
      expect(names).toContain('prompt-context.md');
      expect(names).toContain('risk-findings.json');
    });

    it('bundle manifest has correct structure', () => {
      const bundle = buildSupportBundle(expanded);
      expect(bundle.manifest.version).toBe('1.0');
      expect(bundle.manifest.createdWith).toBe('flow-profile');
      expect(bundle.manifest.parameters.redactionEnabled).toBe(true);
      for (const artifact of bundle.artifacts) {
        expect(artifact.sha256).toMatch(/^[0-9a-f]{64}$/);
        expect(artifact.sizeBytes).toBeGreaterThan(0);
      }
    });
  });

  describe('pipeline outputs are structurally consistent', () => {
    for (const fixture of FIXTURES) {
      it(`${fixture}: about-my-flows node count matches parsed`, async () => {
        const raw = await loadFixture(fixture);
        const { expanded } = pipeline(raw);
        const about = buildAboutMyFlows(expanded);
        expect(about.summary.nodeCount).toBe(expanded.nodes.length);
        expect(about.summary.edgeCount).toBe(expanded.edges.length);
      });

      it(`${fixture}: risk metadata matches node count`, async () => {
        const raw = await loadFixture(fixture);
        const { expanded } = pipeline(raw);
        const result = detectRisks(expanded);
        expect(result.metadata.nodesAnalyzed).toBe(expanded.nodes.length);
      });
    }
  });
});
