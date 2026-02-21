import { buildTokenBudget } from '../budget/tokens.js';
import { type CollapseLevel, collapseFunctionCode } from '../collapse/smart-collapse.js';
import type { ParsedFlow } from '../parser/types.js';
import { detectRisksSimple } from '../risks/detect.js';
import { buildAboutMyFlows } from './about-my-flows.js';
import { buildCapabilityManifestOutput } from './capability-manifest.js';

export interface PromptContextOptions {
  budget?: number;
  collapseOverrides?: Record<string, CollapseLevel>;
}

export function buildPromptContext(flow: ParsedFlow, options: PromptContextOptions = {}): string {
  const about = buildAboutMyFlows(flow);
  const capability = buildCapabilityManifestOutput(flow);
  const riskFindings = detectRisksSimple(flow);
  const collapseOverrides = options.collapseOverrides ?? {};

  const summaryText = `Tabs: ${about.summary.tabCount}\nNodes: ${about.summary.nodeCount}\nSubflows: ${about.summary.subflowCount}`;
  const nodeDescriptionsText = buildNodeDescriptions(flow, about);
  const functionCodeText = buildFunctionCode(flow, collapseOverrides);
  const riskFindingsText = riskFindings
    .map((finding) => `${finding.title} (${finding.severity})`)
    .join('\n');

  const budget = buildTokenBudget(
    {
      summary: summaryText,
      nodeDescriptions: nodeDescriptionsText,
      functionCode: functionCodeText,
      riskFindings: riskFindingsText,
    },
    options.budget ?? 8000,
  );

  const lines: string[] = ['# Flow Context', ''];
  lines.push(...buildSummarySection(about, budget));
  lines.push(...buildIoSurfaceSection(about));
  lines.push(...buildCapabilitiesSection(capability));
  lines.push(...buildFlowStructureSection(flow, about));
  lines.push(...buildFunctionCodeSection(flow, collapseOverrides));
  lines.push(...buildRedactionsSection());
  lines.push(...buildRiskFindingsSection(riskFindings));

  return lines.join('\n');
}

function buildSummarySection(
  about: ReturnType<typeof buildAboutMyFlows>,
  budget: ReturnType<typeof buildTokenBudget>,
): string[] {
  return [
    '## Summary',
    `- ${about.summary.tabCount} tabs, ${about.summary.nodeCount} nodes, ${about.summary.subflowCount} subflows`,
    `- Token estimate: ~${budget.current} (budget: ${budget.budget})`,
    `- Token status: ${budget.status}`,
    '',
  ];
}

function buildIoSurfaceSection(about: ReturnType<typeof buildAboutMyFlows>): string[] {
  const lines: string[] = ['## I/O Surface', '### Inputs'];

  if (about.ioSurface.inputs.length === 0) {
    lines.push('- None');
  } else {
    for (const input of about.ioSurface.inputs) {
      lines.push(`- ${input.type} (${input.name})`);
    }
  }

  lines.push('', '### Outputs');

  if (about.ioSurface.outputs.length === 0) {
    lines.push('- None');
  } else {
    for (const output of about.ioSurface.outputs) {
      lines.push(`- ${output.type} (${output.name})`);
    }
  }

  lines.push('');
  return lines;
}

function buildCapabilitiesSection(
  capability: ReturnType<typeof buildCapabilityManifestOutput>,
): string[] {
  return [
    '## Capabilities Summary',
    `- **Tools (actions)**: ${capability.tools.length}`,
    `- **Resources (data sources)**: ${capability.resources.length}`,
    '',
  ];
}

function buildFlowStructureSection(
  flow: ParsedFlow,
  about: ReturnType<typeof buildAboutMyFlows>,
): string[] {
  const lines: string[] = ['## Flow Structure'];

  for (const tab of about.tabs) {
    lines.push(`### Tab: ${tab.name}`);
    const nodes = flow.nodes.filter((node) => node.z === tab.id);
    if (nodes.length === 0) {
      lines.push('- (no nodes)');
    } else {
      for (const node of nodes) {
        const label = node.name ? `${node.type} (${node.name})` : `${node.type} (${node.id})`;
        lines.push(`- ${label}`);
      }
    }
    lines.push('');
  }

  return lines;
}

function buildFunctionCodeSection(
  flow: ParsedFlow,
  overrides: Record<string, CollapseLevel>,
): string[] {
  const lines: string[] = ['## Function Code'];
  const functionNodes = flow.nodes.filter((node) => node.type === 'function');

  if (functionNodes.length === 0) {
    lines.push('- None', '');
    return lines;
  }

  for (const node of functionNodes) {
    const collapseLevel = overrides[node.id];
    const raw = node.raw as Record<string, unknown>;
    const collapse = collapseFunctionCode(
      // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
      { id: node.id, name: node.name, func: String(raw['func'] ?? '') },
      collapseLevel,
    );
    lines.push(`### Function: ${node.name ?? node.id}`);
    lines.push('```js');
    lines.push(collapse.collapsedCode);
    lines.push('```');
  }

  lines.push('');
  return lines;
}

function buildRedactionsSection(): string[] {
  return ['## Redactions', '0 values redacted', ''];
}

function buildRiskFindingsSection(riskFindings: ReturnType<typeof detectRisksSimple>): string[] {
  const lines: string[] = ['## Risk Findings'];

  if (riskFindings.length === 0) {
    lines.push('- None');
    return lines;
  }

  for (const finding of riskFindings) {
    lines.push(`- ${finding.title} (${finding.severity})`);
  }

  return lines;
}

function buildNodeDescriptions(
  flow: ParsedFlow,
  about: ReturnType<typeof buildAboutMyFlows>,
): string {
  const lines: string[] = [];

  for (const tab of about.tabs) {
    lines.push(`Tab: ${tab.name}`);
    const nodes = flow.nodes.filter((node) => node.z === tab.id);
    for (const node of nodes) {
      lines.push(node.name ? `${node.type}: ${node.name}` : `${node.type}: ${node.id}`);
    }
  }

  return lines.join('\n');
}

function buildFunctionCode(flow: ParsedFlow, overrides: Record<string, CollapseLevel>): string {
  const lines: string[] = [];

  const functionNodes = flow.nodes.filter((node) => node.type === 'function');
  for (const node of functionNodes) {
    const level = overrides[node.id];
    const raw = node.raw as Record<string, unknown>;
    const collapse = collapseFunctionCode(
      // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
      { id: node.id, name: node.name, func: String(raw['func'] ?? '') },
      level,
    );
    lines.push(collapse.collapsedCode);
  }

  return lines.join('\n');
}
