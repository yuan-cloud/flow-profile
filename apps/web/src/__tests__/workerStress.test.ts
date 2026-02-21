import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseJsonSafe } from '@/utils/errorHandling';
import { buildResultFromInput, buildResultFromParts } from '@/workers/buildResult';

const FIXTURES_DIR = resolve(__dirname, '../../../../testdata/fixtures');

function loadFixture(name: string): unknown {
  const raw = readFileSync(resolve(FIXTURES_DIR, name), 'utf-8');
  const parsed = parseJsonSafe(raw);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

describe('Worker stress and recovery', () => {
  describe('large payload handling', () => {
    it('processes 500-node flow without error', () => {
      const input = loadFixture('large-500-nodes.json');
      const result = buildResultFromInput(input);

      expect(result.aboutMyFlows.summary.nodeCount).toBeGreaterThanOrEqual(100);
      expect(result.tokenEstimate.current).toBeGreaterThan(0);
      expect(Array.isArray(result.riskFindings)).toBe(true);
    });

    it('500-node flow has consistent token estimate', () => {
      const input = loadFixture('large-500-nodes.json');
      const r1 = buildResultFromInput(input);
      const r2 = buildResultFromInput(input);

      expect(r1.tokenEstimate.current).toBe(r2.tokenEstimate.current);
      expect(r1.tokenEstimate.status).toBe(r2.tokenEstimate.status);
    });

    it('500-node flow produces node lines for every node', () => {
      const input = loadFixture('large-500-nodes.json');
      const result = buildResultFromInput(input);

      expect(result.contextSections.nodeLines.length).toBe(result.aboutMyFlows.summary.nodeCount);
    });
  });

  describe('rapid sequential processing', () => {
    const FIXTURES = [
      'simple.json',
      'with-subflows.json',
      'secrets-entropy.json',
      'risk-triggers.json',
      'capability-surface.json',
      'large-500-nodes.json',
    ];

    it('processes all fixtures in rapid succession without error', () => {
      const results = FIXTURES.map((f) => buildResultFromInput(loadFixture(f)));

      expect(results).toHaveLength(FIXTURES.length);
      for (const result of results) {
        expect(result.aboutMyFlows.summary.nodeCount).toBeGreaterThan(0);
        expect(result.tokenEstimate.current).toBeGreaterThan(0);
      }
    });

    it('repeated rapid processing of same fixture is deterministic', () => {
      const input = loadFixture('risk-triggers.json');
      const results = Array.from({ length: 10 }, () => buildResultFromInput(input));

      const first = results[0];
      for (let i = 1; i < results.length; i++) {
        expect(results[i].aboutMyFlows).toEqual(first.aboutMyFlows);
        expect(results[i].promptContext).toBe(first.promptContext);
        expect(results[i].riskFindings).toEqual(first.riskFindings);
        expect(results[i].tokenEstimate).toEqual(first.tokenEstimate);
      }
    });
  });

  describe('invalid input recovery', () => {
    it('throws on completely invalid JSON object', () => {
      expect(() => buildResultFromInput('not json')).toThrow();
    });

    it('throws on null input', () => {
      expect(() => buildResultFromInput(null)).toThrow();
    });

    it('handles empty array as empty flow', () => {
      const result = buildResultFromInput([]);

      expect(result.aboutMyFlows.summary.nodeCount).toBe(0);
      expect(result.aboutMyFlows.summary.tabCount).toBe(0);
    });

    it('throws on object without flow structure', () => {
      expect(() => buildResultFromInput({ random: 'data' })).toThrow();
    });

    it('handles flow with only a tab (no nodes)', () => {
      const minimalFlow = [{ id: 'tab1', type: 'tab', label: 'Empty' }];
      const result = buildResultFromInput(minimalFlow);

      expect(result.aboutMyFlows.summary.nodeCount).toBe(0);
      expect(result.aboutMyFlows.summary.tabCount).toBe(1);
      expect(result.riskFindings).toEqual([]);
    });
  });

  describe('output integrity under stress', () => {
    it('all fixtures produce valid aboutMyFlows structure', () => {
      const fixtures = ['simple.json', 'with-subflows.json', 'capability-surface.json'];

      for (const fixture of fixtures) {
        const result = buildResultFromInput(loadFixture(fixture));
        const about = result.aboutMyFlows;

        expect(about.version).toBe('0.1');
        expect(about.summary.tabCount).toBeGreaterThanOrEqual(1);
        expect(about.summary.nodeCount).toBeGreaterThanOrEqual(0);
        expect(about.summary.edgeCount).toBeGreaterThanOrEqual(0);
        expect(typeof about.categoryCounts).toBe('object');
        expect(about.expandedNodeCount).toBeGreaterThanOrEqual(0);
      }
    });

    it('all fixtures produce valid tokenEstimate', () => {
      const fixtures = ['simple.json', 'large-500-nodes.json', 'risk-triggers.json'];

      for (const fixture of fixtures) {
        const result = buildResultFromInput(loadFixture(fixture));
        const te = result.tokenEstimate;

        expect(te.current).toBeGreaterThan(0);
        expect(te.budget).toBe(8000);
        expect(['ok', 'warning', 'over']).toContain(te.status);
        expect(te.breakdown.summary).toBeGreaterThan(0);
      }
    });

    it('context sections include nodeLines with required fields', () => {
      const result = buildResultFromInput(loadFixture('capability-surface.json'));

      for (const node of result.contextSections.nodeLines) {
        expect(node.id).toBeTruthy();
        expect(node.label).toBeTruthy();
        expect(node.type).toBeTruthy();
        expect(typeof node.tokens).toBe('number');
      }
    });

    it('subflow labels are populated for flows with subflows', () => {
      const result = buildResultFromInput(loadFixture('with-subflows.json'));

      const labels = result.contextSections.subflowLabels;
      expect(Object.keys(labels).length).toBeGreaterThan(0);
    });
  });

  describe('buildResultFromParts edge cases', () => {
    it('handles parsed flow with no edges', () => {
      const { categorizeFlow, expandSubflows, parseFlow } = require('@flow-profile/core');
      const input = [
        { id: 'tab1', type: 'tab', label: 'No Edges' },
        { id: 'n1', type: 'inject', z: 'tab1', x: 0, y: 0, wires: [] },
      ];

      const parsed = parseFlow(input);
      const expanded = expandSubflows(parsed);
      const categorySummary = categorizeFlow(parsed);
      const riskFindings: never[] = [];

      const result = buildResultFromParts({ parsed, expanded, categorySummary, riskFindings });

      expect(result.aboutMyFlows.summary.edgeCount).toBe(0);
      expect(result.aboutMyFlows.summary.nodeCount).toBe(1);
    });
  });
});
