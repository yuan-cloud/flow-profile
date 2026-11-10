import {
  categorizeFlow,
  detectRisksSimple,
  expandSubflows,
  parseFlow,
  type RedactionReport,
  redactSecrets,
} from '@flow-profile/core';

import type { BuildOptions, BuildResult } from '@/types/worker';

export const DEFAULT_BUILD_OPTIONS: BuildOptions = {
  redactionEnabled: true,
  strictMode: true,
  entropyThreshold: 4.5,
  flattenSubflows: true,
};

type ParsedFlow = ReturnType<typeof parseFlow>;
type ExpandedFlow = ReturnType<typeof expandSubflows>;
type CategorySummary = ReturnType<typeof categorizeFlow>;
type RiskFindings = ReturnType<typeof detectRisksSimple>;

const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

const buildSummaryLines = (summary: {
  tabCount: number;
  nodeCount: number;
  edgeCount: number;
  subflowCount: number;
  configNodeCount: number;
}): string[] => {
  return [
    '# Flow Profile Context',
    '',
    `Tabs: ${summary.tabCount}`,
    `Nodes: ${summary.nodeCount}`,
    `Edges: ${summary.edgeCount}`,
    `Subflows: ${summary.subflowCount}`,
    `Config nodes: ${summary.configNodeCount}`,
  ];
};

const buildPromptContext = (summaryLines: string[]): string => summaryLines.join('\n');

const buildNodeLines = (parsed: ParsedFlow, tabLabels: Map<string, string>) => {
  return parsed.nodes.map((node) => {
    const label = node.name ?? node.type;
    const tabLabel = node.z ? tabLabels.get(node.z) : undefined;
    const line = tabLabel ? `${label} (${node.type}) — ${tabLabel}` : `${label} (${node.type})`;
    return {
      id: node.id,
      label,
      type: node.type,
      tabId: node.z,
      tabLabel,
      tokens: estimateTokens(line),
    };
  });
};

const buildResultFromParts = ({
  parsed,
  expanded,
  categorySummary,
  riskFindings,
  parameters,
  redactionReport,
}: {
  parsed: ParsedFlow;
  expanded: Pick<ExpandedFlow, 'nodes' | 'edges'>;
  categorySummary: CategorySummary;
  riskFindings: RiskFindings;
  parameters: BuildOptions;
  redactionReport: RedactionReport;
}): BuildResult => {
  const summary = {
    tabCount: parsed.tabs.length,
    nodeCount: parsed.nodes.length,
    edgeCount: parsed.edges.length,
    subflowCount: parsed.subflowDefs.length,
    configNodeCount: parsed.configNodes.length,
  };

  const summaryLines = buildSummaryLines(summary);
  const promptContext = buildPromptContext(summaryLines);
  const currentTokens = estimateTokens(promptContext);
  const tabLabels = new Map(parsed.tabs.map((tab) => [tab.id, tab.label ?? tab.id]));
  const nodeLines = buildNodeLines(parsed, tabLabels);
  const subflowLabels = Object.fromEntries(
    parsed.subflowDefs.map((def) => [def.id, def.name ?? def.id]),
  );
  const tokenEstimate: BuildResult['tokenEstimate'] = {
    current: currentTokens,
    budget: 8000,
    status: currentTokens > 8000 ? 'over' : currentTokens > 6400 ? 'warning' : 'ok',
    breakdown: {
      summary: currentTokens,
    },
  };

  return {
    parameters,
    redactionReport,
    aboutMyFlows: {
      version: '0.1',
      summary,
      categoryCounts: categorySummary.counts,
      expandedNodeCount: expanded.nodes.length,
      expandedEdgeCount: expanded.edges.length,
    },
    promptContext,
    riskFindings,
    capabilityManifest: {
      tools: [],
      resources: [],
      metadata: {
        totalNodes: parsed.nodes.length,
        analyzedNodes: parsed.nodes.length,
        uncertainCount: 0,
      },
    },
    tokenEstimate,
    contextSections: {
      summaryLines,
      nodeLines,
      subflowLabels,
    },
  };
};

export const buildResultFromInput = (
  input: unknown,
  options: Partial<BuildOptions> = {},
  onProgress: (phase: string, percent: number) => void = () => {},
): BuildResult => {
  const parameters = { ...DEFAULT_BUILD_OPTIONS, ...options };
  onProgress('Redacting sensitive values...', 20);
  const { redacted, report } = redactSecrets(input, {
    enabled: parameters.redactionEnabled,
    strictMode: parameters.strictMode,
    entropyThreshold: parameters.entropyThreshold,
  });
  onProgress('Parsing flow structure...', 35);
  const parsed = parseFlow(redacted);
  onProgress('Expanding subflows...', 45);
  const expanded = parameters.flattenSubflows ? expandSubflows(parsed) : parsed;
  onProgress('Categorizing nodes...', 60);
  const categorySummary = categorizeFlow(parsed);
  onProgress('Analyzing risks...', 75);
  const riskFindings = detectRisksSimple(parsed);
  onProgress('Generating outputs...', 90);
  return buildResultFromParts({
    parsed,
    expanded,
    categorySummary,
    riskFindings,
    parameters,
    redactionReport: report,
  });
};
