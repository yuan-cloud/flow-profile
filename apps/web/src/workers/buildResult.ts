import { categorizeFlow, detectRisksSimple, expandSubflows, parseFlow } from '@flow-profile/core';

import type { BuildResult } from '@/types/worker';

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

export const buildResultFromParts = ({
  parsed,
  expanded,
  categorySummary,
  riskFindings,
}: {
  parsed: ParsedFlow;
  expanded: ExpandedFlow;
  categorySummary: CategorySummary;
  riskFindings: RiskFindings;
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
  const tokenEstimate = {
    current: currentTokens,
    budget: 8000,
    status: currentTokens > 8000 ? 'over' : currentTokens > 6400 ? 'warning' : 'ok',
    breakdown: {
      summary: currentTokens,
    },
  };

  return {
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

export const buildResultFromInput = (input: unknown): BuildResult => {
  const parsed = parseFlow(input);
  const expanded = expandSubflows(parsed);
  const categorySummary = categorizeFlow(parsed);
  const riskFindings = detectRisksSimple(parsed);
  return buildResultFromParts({ parsed, expanded, categorySummary, riskFindings });
};
