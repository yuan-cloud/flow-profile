import { buildCapabilityManifest } from '../capability/manifest.js';
import { categorizeFlow } from '../categorize/categorize.js';
import type { Node, ParsedFlow } from '../parser/types.js';
import { detectRisks } from '../risks/detect.js';

export type RunbookOptions = {
  title?: string;
  author?: string;
  includeCode?: boolean;
  version?: string;
};

export function generateRunbookMarkdown(flow: ParsedFlow, options: RunbookOptions = {}): string {
  const title = options.title ?? 'Flow Documentation';
  const version = options.version ?? 'unknown';
  const summary = buildSummary(flow);
  const ioSurface = buildIoSurface(flow);
  const risks = buildRiskSummary(flow);
  const checklist = buildChecklist(risks);
  const structure = buildFlowStructure(flow);
  const dependencies = buildDependencies(flow);
  const purpose = inferPurpose(ioSurface.inputTypes, ioSurface.outputTypes);

  const lines = [
    ...buildHeaderLines(title, version, options.author),
    ...buildOverviewLines(summary, dependencies, purpose),
    ...buildIoLines(ioSurface, dependencies),
    ...buildFlowStructureLines(structure),
    ...buildRiskLines(risks),
    ...buildChecklistLines(checklist),
    ...buildFunctionCodeLines(flow, options.includeCode ?? false),
  ];

  return lines.join('\n');
}

type Summary = {
  tabCount: number;
  totalNodes: number;
};

type IoEntry = {
  type: string;
  description: string;
  node: string;
};

type IoSurface = {
  inputs: IoEntry[];
  outputs: IoEntry[];
  inputTypes: string[];
  outputTypes: string[];
};

type RiskSummary = {
  findings: Array<{ title: string; severity: string }>;
};

type DependencySummary = {
  items: string[];
};

type FlowSection = {
  label: string;
  description?: string;
  nodes: string[];
};

type CodeBlock = {
  title: string;
  code: string;
};

function buildSummary(flow: ParsedFlow): Summary {
  const categorySummary = categorizeFlow(flow);
  return {
    tabCount: flow.tabs.length,
    totalNodes: categorySummary.total,
  };
}

function buildIoSurface(flow: ParsedFlow): IoSurface {
  const manifest = buildCapabilityManifest(flow);
  const inputs = manifest.resources
    .map((resource) => buildIoEntry(flow, resource.nodeId, resource.description))
    .filter((entry): entry is IoEntry => Boolean(entry))
    .sort((a, b) => a.node.localeCompare(b.node));

  const outputs = manifest.tools
    .map((tool) => buildIoEntry(flow, tool.nodeId, tool.description))
    .filter((entry): entry is IoEntry => Boolean(entry))
    .sort((a, b) => a.node.localeCompare(b.node));

  return {
    inputs,
    outputs,
    inputTypes: inputs.map((entry) => entry.type),
    outputTypes: outputs.map((entry) => entry.type),
  };
}

function buildIoEntry(flow: ParsedFlow, nodeId: string, description: string): IoEntry | null {
  const node = flow.nodesById.get(nodeId);
  if (!node) return null;
  const type = formatIoType(node.type);
  const name = node.name ?? node.type;
  return { type, description, node: name };
}

function formatIoTable(entries: IoEntry[]): string[] {
  const lines: string[] = [];
  lines.push('| Type | Description | Node |');
  lines.push('|------|-------------|------|');
  if (entries.length === 0) {
    lines.push('| - | No inputs detected | - |');
    return lines;
  }

  for (const entry of entries) {
    lines.push(`| ${entry.type} | ${entry.description} | ${entry.node} |`);
  }

  return lines;
}

function formatIoType(nodeType: string): string {
  const normalized = nodeType.toLowerCase();
  if (normalized.includes('http')) return 'HTTP';
  if (normalized.includes('mqtt')) return 'MQTT';
  if (normalized.includes('websocket')) return 'WebSocket';
  if (normalized.includes('tcp')) return 'TCP';
  if (normalized.includes('udp')) return 'UDP';
  if (normalized.includes('file')) return 'File';
  if (normalized === 'inject') return 'Trigger';
  if (normalized === 'debug') return 'Debug';
  return nodeType;
}

function buildDependencies(flow: ParsedFlow): DependencySummary {
  const items = flow.configNodes
    .map((node) => buildDependencyLabel(node))
    .filter((label): label is string => Boolean(label))
    .sort((a, b) => a.localeCompare(b));
  return { items };
}

function buildDependencyLabel(node: Node): string | null {
  const name = node.name ?? node.type;
  const raw = node.raw as Record<string, unknown>;
  const host =
    // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
    asString(raw['broker']) ??
    // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
    asString(raw['host']) ??
    // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
    asString(raw['server']) ??
    // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
    asString(raw['url']);
  // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
  const port = asString(raw['port']);
  const details = [host, port].filter((value) => value && value.length > 0).join(':');
  if (details.length > 0) {
    return `${name}: ${details}`;
  }
  return name;
}

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  if (typeof value === 'number') return String(value);
  return null;
}

function buildFlowStructure(flow: ParsedFlow): FlowSection[] {
  const nodesByTab = new Map<string, Node[]>();

  for (const node of flow.nodes) {
    if (!node.z) continue;
    const list = nodesByTab.get(node.z) ?? [];
    list.push(node);
    nodesByTab.set(node.z, list);
  }

  return flow.tabs.map((tab) => {
    const nodes = (nodesByTab.get(tab.id) ?? []).slice().sort((a, b) => a.id.localeCompare(b.id));
    const nodeNames = nodes.map((node) => node.name ?? node.type);
    return {
      label: tab.label ?? tab.id,
      description: tab.info,
      nodes: nodeNames,
    };
  });
}

function buildRiskSummary(flow: ParsedFlow): RiskSummary {
  const result = detectRisks(flow);
  const findings = result.findings
    .map((finding) => ({ title: finding.title, severity: finding.severity }))
    .sort((a, b) => {
      const severity = compareSeverity(a.severity, b.severity);
      if (severity !== 0) return severity;
      return a.title.localeCompare(b.title);
    });
  return { findings };
}

function compareSeverity(a: string, b: string): number {
  const weight: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const aWeight = weight[a] ?? 3;
  const bWeight = weight[b] ?? 3;
  return aWeight - bWeight;
}

function buildChecklist(risks: RiskSummary): string[] {
  const checklist = [
    'Verify external dependencies and credentials',
    'Confirm error handling coverage',
    'Review outputs for sensitive data',
  ];

  for (const finding of risks.findings) {
    checklist.push(`Review risk: ${finding.title}`);
  }

  return checklist;
}

function inferPurpose(inputTypes: string[], outputTypes: string[]): string {
  const phrases: string[] = [];
  const inputSet = new Set(inputTypes.map((type) => type.toLowerCase()));
  const outputSet = new Set(outputTypes.map((type) => type.toLowerCase()));

  if (inputSet.has('http')) {
    phrases.push('handle HTTP requests');
  }
  if (inputSet.has('mqtt')) {
    phrases.push('process MQTT messages');
  }
  if (inputSet.has('websocket')) {
    phrases.push('process WebSocket traffic');
  }
  if (inputSet.has('trigger')) {
    phrases.push('run on a schedule or manual trigger');
  }

  if (outputSet.has('http')) {
    phrases.push('respond to HTTP clients');
  }
  if (outputSet.has('file')) {
    phrases.push('write data to files');
  }
  if (outputSet.has('mqtt')) {
    phrases.push('publish MQTT messages');
  }

  if (phrases.length === 0) {
    return 'This flow processes and routes data between nodes.';
  }

  return `This flow appears to ${phrases.join(', ')}.`;
}

function buildFunctionCode(flow: ParsedFlow): CodeBlock[] {
  return flow.nodes
    .filter((node) => node.type.toLowerCase() === 'function')
    .map((node) => {
      const raw = node.raw as Record<string, unknown>;
      // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
      const code = typeof raw['func'] === 'string' ? raw['func'] : '';
      return {
        title: node.name ?? node.id,
        code,
      };
    })
    .filter((block) => block.code.length > 0)
    .sort((a, b) => a.title.localeCompare(b.title));
}

function buildHeaderLines(title: string, version: string, author?: string): string[] {
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`Generated by flow-profile v${version}`);
  if (author) {
    lines.push(`Author: ${author}`);
  }
  lines.push('');
  lines.push(
    '> WARNING: This is auto-generated documentation. Review before using as an operational runbook.',
  );
  lines.push('');
  return lines;
}

function buildOverviewLines(
  summary: Summary,
  dependencies: DependencySummary,
  purpose: string,
): string[] {
  const lines: string[] = [];
  lines.push('## Overview');
  lines.push('');
  lines.push('### Summary');
  lines.push(`- **Tabs**: ${summary.tabCount}`);
  lines.push(`- **Total Nodes**: ${summary.totalNodes}`);
  lines.push(`- **External Dependencies**: ${dependencies.items.length}`);
  lines.push('');
  lines.push('### Purpose (Inferred)');
  lines.push(purpose);
  lines.push('');
  return lines;
}

function buildIoLines(ioSurface: IoSurface, dependencies: DependencySummary): string[] {
  const lines: string[] = [];
  lines.push('## I/O Surface');
  lines.push('');
  lines.push('### Inputs');
  lines.push(...formatIoTable(ioSurface.inputs));
  lines.push('');
  lines.push('### Outputs');
  lines.push(...formatIoTable(ioSurface.outputs));
  lines.push('');
  lines.push('### External Dependencies');
  if (dependencies.items.length === 0) {
    lines.push('- None detected');
  } else {
    for (const item of dependencies.items) {
      lines.push(`- ${item}`);
    }
  }
  lines.push('');
  return lines;
}

function buildFlowStructureLines(structure: FlowSection[]): string[] {
  const lines: string[] = [];
  lines.push('## Flow Structure');
  lines.push('');
  for (const section of structure) {
    lines.push(`### Tab: ${section.label}`);
    if (section.description) {
      lines.push(section.description);
    }
    lines.push(`Nodes: ${section.nodes.length > 0 ? section.nodes.join(' -> ') : '(none)'}`);
    lines.push('');
  }
  return lines;
}

function buildRiskLines(risks: RiskSummary): string[] {
  const lines: string[] = [];
  lines.push('## Risk Assessment');
  lines.push('');
  if (risks.findings.length === 0) {
    lines.push('No risks detected by static analysis.');
    lines.push('');
    return lines;
  }

  lines.push('### Review Recommended');
  lines.push('');
  for (const finding of risks.findings) {
    lines.push(`- **${finding.title}** (${finding.severity})`);
  }
  lines.push('');
  return lines;
}

function buildChecklistLines(checklist: string[]): string[] {
  const lines: string[] = [];
  lines.push('## Operator Checklist');
  lines.push('');
  for (const item of checklist) {
    lines.push(`- [ ] ${item}`);
  }
  lines.push('');
  return lines;
}

function buildFunctionCodeLines(flow: ParsedFlow, includeCode: boolean): string[] {
  if (!includeCode) return [];
  const codeBlocks = buildFunctionCode(flow);
  if (codeBlocks.length === 0) return [];

  const lines: string[] = [];
  lines.push('## Function Code');
  lines.push('');
  for (const block of codeBlocks) {
    lines.push(`### ${block.title}`);
    lines.push('```js');
    lines.push(block.code);
    lines.push('```');
    lines.push('');
  }
  return lines;
}
