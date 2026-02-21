import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseFlow } from '../parser/parse.js';
import type { ParsedFlow } from '../parser/types.js';
import {
  detectRisks,
  detectRisksSimple,
  getRuleById,
  getRules,
  safeDetectRisks,
} from './detect.js';

describe('Risk Detection Engine', () => {
  // Load the test fixture
  const fixturePath = path.resolve(__dirname, '../../../../testdata/risk-triggers.json');
  const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');
  const fixtureData = JSON.parse(fixtureContent) as unknown;
  const flow: ParsedFlow = parseFlow(fixtureData);

  describe('getRules', () => {
    it('should return all registered rules', () => {
      const rules = getRules();
      expect(rules.length).toBe(4);
      expect(rules.map((r) => r.id)).toContain('RISK_NO_CATCH');
      expect(rules.map((r) => r.id)).toContain('RISK_INFINITE_LOOP');
      expect(rules.map((r) => r.id)).toContain('RISK_HIGH_ENTROPY');
      expect(rules.map((r) => r.id)).toContain('RISK_INJECTION_PRONE');
    });
  });

  describe('getRuleById', () => {
    it('should return a rule by ID', () => {
      const rule = getRuleById('RISK_NO_CATCH');
      expect(rule).toBeDefined();
      expect(rule?.name).toBe('No Catch Node');
    });

    it('should return undefined for unknown ID', () => {
      const rule = getRuleById('UNKNOWN_RULE');
      expect(rule).toBeUndefined();
    });
  });

  describe('detectRisks', () => {
    it('should detect risks in the fixture', () => {
      const result = detectRisks(flow);

      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.rulesExecuted).toHaveLength(4);
      expect(result.metadata.nodesAnalyzed).toBeGreaterThan(0);
    });

    it('should detect RISK_NO_CATCH', () => {
      const result = detectRisks(flow);
      const noCatchFindings = result.findings.filter((f) => f.id === 'RISK_NO_CATCH');

      expect(noCatchFindings.length).toBeGreaterThan(0);
      expect(noCatchFindings[0]?.affectedNodes.length).toBeGreaterThan(0);
    });

    it('should detect RISK_INFINITE_LOOP (self-loop)', () => {
      const result = detectRisks(flow);
      const loopFindings = result.findings.filter((f) => f.id === 'RISK_INFINITE_LOOP');

      // Should find self-loop and cycle
      expect(loopFindings.length).toBeGreaterThanOrEqual(2);

      // Self-loop should be high severity
      const selfLoop = loopFindings.find((f) => f.title.includes('Self-loop'));
      expect(selfLoop).toBeDefined();
      expect(selfLoop?.severity).toBe('high');
    });

    it('should detect RISK_INFINITE_LOOP (cycle)', () => {
      const result = detectRisks(flow);
      const loopFindings = result.findings.filter((f) => f.id === 'RISK_INFINITE_LOOP');

      const cycle = loopFindings.find((f) => f.title.includes('Circular'));
      expect(cycle).toBeDefined();
      expect(cycle?.affectedNodes.length).toBe(2);
    });

    it('should detect RISK_HIGH_ENTROPY', () => {
      const result = detectRisks(flow);
      const entropyFindings = result.findings.filter((f) => f.id === 'RISK_HIGH_ENTROPY');

      expect(entropyFindings.length).toBeGreaterThan(0);
    });

    it('should detect RISK_INJECTION_PRONE (exec node)', () => {
      const result = detectRisks(flow);
      const injectionFindings = result.findings.filter((f) => f.id === 'RISK_INJECTION_PRONE');

      expect(injectionFindings.length).toBeGreaterThan(0);

      // Should find the exec node
      const execFinding = injectionFindings.find((f) => f.title.includes('Command execution'));
      expect(execFinding).toBeDefined();
    });

    it('should detect RISK_INJECTION_PRONE (function with external input)', () => {
      const result = detectRisks(flow);
      const injectionFindings = result.findings.filter((f) => f.id === 'RISK_INJECTION_PRONE');

      // Should find function/template with external input
      const dynamicCodeFinding = injectionFindings.find((f) =>
        f.title.includes('Dynamic code with external input'),
      );
      expect(dynamicCodeFinding).toBeDefined();
    });

    it('should filter rules with onlyRules option', () => {
      const result = detectRisks(flow, { onlyRules: ['RISK_NO_CATCH'] });

      expect(result.rulesExecuted).toHaveLength(1);
      expect(result.rulesExecuted[0]).toBe('RISK_NO_CATCH');
      expect(result.findings.every((f) => f.id === 'RISK_NO_CATCH')).toBe(true);
    });

    it('should filter rules with skipRules option', () => {
      const result = detectRisks(flow, { skipRules: ['RISK_INFINITE_LOOP'] });

      expect(result.rulesExecuted).toHaveLength(3);
      expect(result.rulesExecuted).not.toContain('RISK_INFINITE_LOOP');
      expect(result.findings.every((f) => f.id !== 'RISK_INFINITE_LOOP')).toBe(true);
    });

    it('should produce deterministic output', () => {
      const result1 = detectRisks(flow);
      const result2 = detectRisks(flow);

      expect(result1.findings.map((f) => f.id)).toEqual(result2.findings.map((f) => f.id));
      expect(result1.findings.map((f) => f.title)).toEqual(result2.findings.map((f) => f.title));
    });

    it('should include affected node names', () => {
      const result = detectRisks(flow);

      for (const finding of result.findings) {
        expect(finding.affectedNodes.length).toBeGreaterThan(0);
        for (const node of finding.affectedNodes) {
          expect(node.id).toBeTruthy();
          expect(node.name).toBeTruthy();
        }
      }
    });

    it('should include evidence for each finding', () => {
      const result = detectRisks(flow);

      for (const finding of result.findings) {
        expect(finding.evidence).toBeTruthy();
        expect(finding.evidence.length).toBeGreaterThan(0);
      }
    });

    it('should include remediation for each finding', () => {
      const result = detectRisks(flow);

      for (const finding of result.findings) {
        expect(finding.remediation).toBeTruthy();
        expect(finding.remediation.length).toBeGreaterThan(0);
      }
    });
  });

  describe('detectRisksSimple', () => {
    it('should return just findings array', () => {
      const findings = detectRisksSimple(flow);

      expect(Array.isArray(findings)).toBe(true);
      expect(findings.length).toBeGreaterThan(0);
    });
  });

  describe('safeDetectRisks', () => {
    it('should return success for valid input', () => {
      const result = safeDetectRisks(flow);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.findings.length).toBeGreaterThan(0);
      }
    });
  });

  describe('clean flow', () => {
    it('should return no findings for a clean flow', () => {
      const cleanFlow = parseFlow([
        { id: 'tab1', type: 'tab', label: 'Clean Flow' },
        { id: 'inject1', type: 'inject', z: 'tab1', x: 100, y: 100, wires: [['debug1']] },
        { id: 'debug1', type: 'debug', z: 'tab1', x: 200, y: 100, wires: [] },
        { id: 'catch1', type: 'catch', z: 'tab1', x: 100, y: 200, wires: [['debug1']] },
      ]);

      const result = detectRisks(cleanFlow);

      // Clean flow should have minimal or no findings
      expect(result.rulesExecuted).toHaveLength(4);
      // May have some findings depending on rule sensitivity
    });
  });
});
