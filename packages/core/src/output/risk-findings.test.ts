import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseFlow } from '../parser/parse.js';
import { detectRisksSimple, getRules } from '../risks/detect.js';
import type { RiskFinding, RiskSeverity } from '../risks/types.js';
import {
  buildRiskFindingsFromFlow,
  buildRiskFindingsOutput,
  stringifyRiskFindings,
} from './risk-findings.js';

const fixturePath = path.resolve(__dirname, '../../../../testdata/risk-triggers.json');
const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');
const fixtureData = JSON.parse(fixtureContent) as unknown;

const SEVERITY_RANK: Record<RiskSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function compareFindings(a: RiskFinding, b: RiskFinding): number {
  const severityCompare = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
  if (severityCompare !== 0) {
    return severityCompare;
  }

  const idCompare = a.id.localeCompare(b.id);
  if (idCompare !== 0) {
    return idCompare;
  }

  const aNode = a.affectedNodes[0]?.id ?? '';
  const bNode = b.affectedNodes[0]?.id ?? '';
  if (aNode !== bNode) {
    return aNode.localeCompare(bNode);
  }

  return a.title.localeCompare(b.title);
}

describe('risk-findings output', () => {
  it('renders deterministic JSON for risk fixture', () => {
    const flow = parseFlow(fixtureData);
    const jsonA = stringifyRiskFindings(flow);
    const jsonB = stringifyRiskFindings(flow);

    expect(jsonA).toBe(jsonB);
  });

  it('sorts findings by severity desc and id asc', () => {
    const flow = parseFlow(fixtureData);
    const output = buildRiskFindingsFromFlow(flow);
    const sorted = [...output.findings].sort(compareFindings);

    expect(output.findings).toEqual(sorted);
  });

  it('omits timestamps and timing data', () => {
    const flow = parseFlow(fixtureData);
    const output = buildRiskFindingsFromFlow(flow) as Record<string, unknown>;
    const metadata = output.metadata as Record<string, unknown>;

    expect('generatedAt' in output).toBe(false);
    expect('scanDurationMs' in metadata).toBe(false);
  });

  it('accepts precomputed findings', () => {
    const flow = parseFlow(fixtureData);
    const findings = detectRisksSimple(flow);
    const output = buildRiskFindingsOutput(findings);

    expect(output.findingCount).toBe(findings.length);
  });

  it('records rules run deterministically', () => {
    const flow = parseFlow(fixtureData);
    const output = buildRiskFindingsFromFlow(flow);
    const expected = getRules().map((rule) => rule.id);

    expect(output.metadata.rulesRun).toEqual(expected);
  });
});
