import type { ParsedFlow } from '../parser/types.js';
import { detectRisksSimple, getRules } from '../risks/detect.js';
import type { RiskFinding, RiskSeverity } from '../risks/types.js';
import { canonicalStringify } from '../utils/canonical.js';

export interface RiskFindingsOutput {
  version: '1.0';
  findingCount: number;
  findings: RiskFinding[];
  metadata: {
    rulesRun: string[];
  };
}

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

function normalizeFindings(findings: RiskFinding[]): RiskFinding[] {
  const normalized = findings.map((finding) => ({
    ...finding,
    affectedNodes: finding.affectedNodes.map((node) => ({
      id: node.id,
      name: node.name || node.id,
    })),
  }));

  normalized.sort(compareFindings);
  return normalized;
}

export function buildRiskFindingsOutput(findings: RiskFinding[]): RiskFindingsOutput {
  const normalized = normalizeFindings(findings);
  const rulesRun = getRules().map((rule) => rule.id);

  return {
    version: '1.0',
    findingCount: normalized.length,
    findings: normalized,
    metadata: {
      rulesRun,
    },
  };
}

export function buildRiskFindingsFromFlow(flow: ParsedFlow): RiskFindingsOutput {
  return buildRiskFindingsOutput(detectRisksSimple(flow));
}

export function stringifyRiskFindings(findings: RiskFinding[], indent?: number): string;
export function stringifyRiskFindings(flow: ParsedFlow, indent?: number): string;
export function stringifyRiskFindings(input: RiskFinding[] | ParsedFlow, indent = 2): string {
  if (Array.isArray(input)) {
    return canonicalStringify(buildRiskFindingsOutput(input), { indent });
  }

  return canonicalStringify(buildRiskFindingsFromFlow(input), { indent });
}
