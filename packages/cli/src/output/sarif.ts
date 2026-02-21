import { canonicalStringify, getRules, type RiskFinding, VERSION } from '@flow-profile/core';

type SarifLog = {
  $schema: string;
  version: '2.1.0';
  runs: SarifRun[];
};

type SarifRun = {
  tool: {
    driver: SarifDriver;
  };
  results: SarifResult[];
};

type SarifDriver = {
  name: string;
  version: string;
  rules: SarifRule[];
};

type SarifRule = {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  defaultConfiguration: { level: SarifLevel };
};

type SarifResult = {
  ruleId: string;
  level: SarifLevel;
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region: { startLine: number };
    };
  }>;
  fixes?: Array<{ description: { text: string } }>;
  properties?: {
    confidence?: string;
    affectedNodes?: Array<{ id: string; name: string }>;
  };
};

type SarifLevel = 'error' | 'warning' | 'note';

const SARIF_SCHEMA =
  'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json';

const SEVERITY_TO_LEVEL: Record<RiskFinding['severity'], SarifLevel> = {
  high: 'error',
  medium: 'warning',
  low: 'note',
};

type SarifInput = {
  findings: Array<RiskFinding & { filePath?: string }>;
  rulesExecuted: string[];
};

type SarifOptions = {
  inputPath: string;
};

export function formatSarifLog(result: SarifInput, options: SarifOptions): string {
  const log = buildSarifLog(result, options);
  return canonicalStringify(log, { indent: 2 });
}

function buildSarifLog(result: SarifInput, options: SarifOptions): SarifLog {
  return {
    $schema: SARIF_SCHEMA,
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: buildDriver(result),
        },
        results: result.findings.map((finding) => toSarifResult(finding, options.inputPath)),
      },
    ],
  };
}

function buildDriver(result: SarifInput): SarifDriver {
  const rulesById = new Map(getRules().map((rule) => [rule.id, rule]));
  const rules = result.rulesExecuted
    .map((id) => rulesById.get(id))
    .filter((rule): rule is NonNullable<typeof rule> => Boolean(rule))
    .map((rule) => buildRuleDescriptor(rule, result.findings));

  return {
    name: 'flow-profile',
    version: VERSION,
    rules,
  };
}

function buildRuleDescriptor(
  rule: { id: string; name: string; description: string },
  findings: RiskFinding[],
): SarifRule {
  const matching = findings.filter((finding) => finding.id === rule.id);
  const level = highestLevel(matching);

  return {
    id: rule.id,
    name: rule.name,
    shortDescription: { text: rule.name },
    fullDescription: { text: rule.description },
    defaultConfiguration: { level },
  };
}

function highestLevel(findings: RiskFinding[]): SarifLevel {
  let level: SarifLevel = 'note';
  for (const finding of findings) {
    const mapped = SEVERITY_TO_LEVEL[finding.severity];
    if (mapped === 'error') return 'error';
    if (mapped === 'warning') level = 'warning';
  }
  return level;
}

function toSarifResult(
  finding: RiskFinding & { filePath?: string },
  inputPath: string,
): SarifResult {
  const affected = formatAffectedNodes(finding);
  const pathHint = finding.filePath ?? inputPath;

  return {
    ruleId: finding.id,
    level: SEVERITY_TO_LEVEL[finding.severity],
    message: {
      text: affected
        ? `${finding.title}. ${finding.description} Affected nodes: ${affected}`
        : `${finding.title}. ${finding.description}`,
    },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: normalizeUri(pathHint) },
          region: { startLine: 1 },
        },
      },
    ],
    fixes: finding.remediation
      ? [
          {
            description: { text: finding.remediation },
          },
        ]
      : undefined,
    properties: {
      confidence: finding.confidence,
      affectedNodes: finding.affectedNodes,
    },
  };
}

function formatAffectedNodes(finding: RiskFinding): string | null {
  if (!finding.affectedNodes.length) return null;
  return finding.affectedNodes.map((node) => `${node.name} (${node.id})`).join(', ');
}

function normalizeUri(value: string): string {
  return value.replaceAll('\\', '/');
}
