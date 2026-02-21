import type { Node, ParsedFlow, Tab } from '../parser/types.js';
import { canonicalStringify } from '../utils/canonical.js';

type NodeDisplay = {
  id: string;
  name: string;
  type: string;
  tabId?: string;
  tabLabel?: string;
};

type ConfigChange = {
  key: string;
  before: string;
  after: string;
};

type NodeDiff = {
  before: NodeDisplay;
  after: NodeDisplay;
  configChanges: ConfigChange[];
  codeDiff?: string;
  idChanged: boolean;
};

type FlowDiffSummary = {
  nodesAdded: number;
  nodesRemoved: number;
  nodesModified: number;
  tabsAdded: number;
  tabsRemoved: number;
};

type FlowDiffResult = {
  summary: FlowDiffSummary;
  addedNodes: NodeDisplay[];
  removedNodes: NodeDisplay[];
  modifiedNodes: NodeDiff[];
  addedTabs: Tab[];
  removedTabs: Tab[];
};

type DiffLabels = {
  beforeLabel: string;
  afterLabel: string;
};

const DISPLAY_SORT = (a: NodeDisplay, b: NodeDisplay): number => {
  const tab = (a.tabLabel ?? '').localeCompare(b.tabLabel ?? '');
  if (tab !== 0) return tab;
  const name = a.name.localeCompare(b.name);
  if (name !== 0) return name;
  const type = a.type.localeCompare(b.type);
  if (type !== 0) return type;
  return a.id.localeCompare(b.id);
};

const normalizeTabLabel = (tabsById: Map<string, Tab>, tabId?: string): string | undefined => {
  if (!tabId) return undefined;
  const tab = tabsById.get(tabId);
  return tab?.label ?? tabId;
};

const nodeDisplay = (node: Node, tabsById: Map<string, Tab>): NodeDisplay => ({
  id: node.id,
  name: node.name ?? node.id,
  type: node.type,
  tabId: node.z,
  tabLabel: normalizeTabLabel(tabsById, node.z),
});

const nodeSignature = (node: Node, tabsById: Map<string, Tab>): string => {
  const tabLabel = normalizeTabLabel(tabsById, node.z) ?? '';
  const name = node.name ?? '';
  return `${node.type}::${name}::${tabLabel}`;
};

const buildLcsMatrix = (beforeLines: string[], afterLines: string[]): number[][] => {
  const matrix: number[][] = Array.from({ length: beforeLines.length + 1 }, () =>
    Array(afterLines.length + 1).fill(0),
  );

  for (let i = 1; i <= beforeLines.length; i += 1) {
    const row = matrix[i];
    const prevRow = matrix[i - 1];
    if (!row || !prevRow) continue;
    for (let j = 1; j <= afterLines.length; j += 1) {
      if (beforeLines[i - 1] === afterLines[j - 1]) {
        row[j] = (prevRow[j - 1] ?? 0) + 1;
      } else {
        row[j] = Math.max(prevRow[j] ?? 0, row[j - 1] ?? 0);
      }
    }
  }

  return matrix;
};

const matrixValue = (matrix: number[][], i: number, j: number): number => matrix[i]?.[j] ?? 0;

const buildDiffLines = (
  beforeLines: string[],
  afterLines: string[],
  matrix: number[][],
): string[] => {
  const lines: string[] = [];
  let i = beforeLines.length;
  let j = afterLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && beforeLines[i - 1] === afterLines[j - 1]) {
      lines.push(` ${beforeLines[i - 1]}`);
      i -= 1;
      j -= 1;
      continue;
    }

    if (j > 0 && (i === 0 || matrixValue(matrix, i, j - 1) >= matrixValue(matrix, i - 1, j))) {
      lines.push(`+${afterLines[j - 1]}`);
      j -= 1;
      continue;
    }

    if (i > 0) {
      lines.push(`-${beforeLines[i - 1]}`);
      i -= 1;
    }
  }

  return lines.reverse();
};

const diffLines = (before: string, after: string): string => {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const matrix = buildLcsMatrix(beforeLines, afterLines);
  return buildDiffLines(beforeLines, afterLines, matrix).join('\n');
};

const extractComparableConfig = (node: Node): Record<string, unknown> => {
  const raw = node.raw as Record<string, unknown>;
  const ignore = new Set(['id', 'x', 'y', 'wires', 'z']);
  const entries = Object.entries(raw).filter(([key]) => !ignore.has(key));
  entries.sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries);
};

const diffConfig = (before: Node, after: Node): ConfigChange[] => {
  const beforeConfig = extractComparableConfig(before);
  const afterConfig = extractComparableConfig(after);
  const keys = new Set([...Object.keys(beforeConfig), ...Object.keys(afterConfig)]);
  const changes: ConfigChange[] = [];

  for (const key of Array.from(keys).sort()) {
    const beforeValue = beforeConfig[key];
    const afterValue = afterConfig[key];
    if (canonicalStringify(beforeValue) !== canonicalStringify(afterValue)) {
      changes.push({
        key,
        before: canonicalStringify(beforeValue),
        after: canonicalStringify(afterValue),
      });
    }
  }

  if (before.type !== after.type) {
    changes.unshift({ key: 'type', before: before.type, after: after.type });
  }

  if (before.z !== after.z) {
    changes.unshift({ key: 'tab', before: before.z ?? '-', after: after.z ?? '-' });
  }

  return changes;
};

const diffFunctionCode = (before: Node, after: Node): string | undefined => {
  if (before.type !== 'function' || after.type !== 'function') return undefined;
  const readFunc = (node: Node): string => {
    const raw = node.raw as Record<string, unknown>;
    // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
    return typeof raw['func'] === 'string' ? String(raw['func']) : '';
  };
  const beforeCode = readFunc(before);
  const afterCode = readFunc(after);
  if (beforeCode === afterCode) return undefined;
  return diffLines(beforeCode, afterCode);
};

const collectNodes = (flow: ParsedFlow): Node[] => [...flow.nodes, ...flow.configNodes];

const matchById = (afterNodesById: Map<string, Node>, beforeNodesById: Map<string, Node>) => {
  const matchedIds = new Set<string>();
  const added: Node[] = [];
  const removed: Node[] = [];

  for (const [id, afterNode] of afterNodesById) {
    if (beforeNodesById.has(id)) {
      matchedIds.add(id);
    } else {
      added.push(afterNode);
    }
  }

  for (const [id, beforeNode] of beforeNodesById) {
    if (!matchedIds.has(id)) {
      removed.push(beforeNode);
    }
  }

  return { matchedIds, added, removed };
};

const buildSignatureMap = (nodes: Node[], tabsById: Map<string, Tab>): Map<string, Node[]> => {
  const map = new Map<string, Node[]>();
  for (const node of nodes) {
    const signature = nodeSignature(node, tabsById);
    const list = map.get(signature) ?? [];
    list.push(node);
    map.set(signature, list);
  }
  return map;
};

const pairBySignature = (
  added: Node[],
  removed: Node[],
  afterTabs: Map<string, Tab>,
  beforeTabs: Map<string, Tab>,
) => {
  const beforeSignatureMap = buildSignatureMap(removed, beforeTabs);
  const afterSignatureMap = buildSignatureMap(added, afterTabs);
  const pairedRemoved = new Set<string>();
  const pairedAdded = new Set<string>();
  const pairs: Array<{ before: Node; after: Node }> = [];

  for (const [signature, beforeList] of beforeSignatureMap.entries()) {
    const afterList = afterSignatureMap.get(signature);
    if (!afterList || beforeList.length !== 1 || afterList.length !== 1) {
      continue;
    }
    const beforeNode = beforeList[0];
    const afterNode = afterList[0];
    if (!beforeNode || !afterNode) {
      continue;
    }
    pairedRemoved.add(beforeNode.id);
    pairedAdded.add(afterNode.id);
    pairs.push({ before: beforeNode, after: afterNode });
  }

  return { pairedRemoved, pairedAdded, pairs };
};

const buildModified = (
  pairs: Array<{ before: Node; after: Node }>,
  beforeNodesById: Map<string, Node>,
  afterNodesById: Map<string, Node>,
  matchedIds: Set<string>,
  beforeTabs: Map<string, Tab>,
  afterTabs: Map<string, Tab>,
): NodeDiff[] => {
  const modified: NodeDiff[] = [];
  const addModified = (beforeNode: Node, afterNode: Node, idChanged: boolean) => {
    const configChanges = diffConfig(beforeNode, afterNode);
    const codeDiff = diffFunctionCode(beforeNode, afterNode);
    if (configChanges.length === 0 && !codeDiff) return;

    modified.push({
      before: nodeDisplay(beforeNode, beforeTabs),
      after: nodeDisplay(afterNode, afterTabs),
      configChanges,
      codeDiff,
      idChanged,
    });
  };

  for (const pair of pairs) {
    addModified(pair.before, pair.after, true);
  }

  for (const id of matchedIds) {
    const beforeNode = beforeNodesById.get(id);
    const afterNode = afterNodesById.get(id);
    if (!beforeNode || !afterNode) continue;
    addModified(beforeNode, afterNode, false);
  }

  return modified;
};

export const compareFlows = (afterFlow: ParsedFlow, beforeFlow: ParsedFlow): FlowDiffResult => {
  const beforeNodes = collectNodes(beforeFlow);
  const afterNodes = collectNodes(afterFlow);
  const beforeNodesById = new Map(beforeNodes.map((node) => [node.id, node]));
  const afterNodesById = new Map(afterNodes.map((node) => [node.id, node]));
  const beforeTabs = beforeFlow.tabsById;
  const afterTabs = afterFlow.tabsById;

  const { matchedIds, added, removed } = matchById(afterNodesById, beforeNodesById);
  const { pairedRemoved, pairedAdded, pairs } = pairBySignature(
    added,
    removed,
    afterTabs,
    beforeTabs,
  );

  const modified = buildModified(
    pairs,
    beforeNodesById,
    afterNodesById,
    matchedIds,
    beforeTabs,
    afterTabs,
  );

  const addedNodes = added
    .filter((node) => !pairedAdded.has(node.id))
    .map((node) => nodeDisplay(node, afterTabs))
    .sort(DISPLAY_SORT);

  const removedNodes = removed
    .filter((node) => !pairedRemoved.has(node.id))
    .map((node) => nodeDisplay(node, beforeTabs))
    .sort(DISPLAY_SORT);

  modified.sort((a, b) => DISPLAY_SORT(a.after, b.after));

  const addedTabs = afterFlow.tabs.filter((tab) => !beforeFlow.tabsById.has(tab.id));
  const removedTabs = beforeFlow.tabs.filter((tab) => !afterFlow.tabsById.has(tab.id));

  return {
    summary: {
      nodesAdded: addedNodes.length,
      nodesRemoved: removedNodes.length,
      nodesModified: modified.length,
      tabsAdded: addedTabs.length,
      tabsRemoved: removedTabs.length,
    },
    addedNodes,
    removedNodes,
    modifiedNodes: modified,
    addedTabs,
    removedTabs,
  };
};

const buildSummaryLines = (diff: FlowDiffResult): string[] => [
  '## Summary',
  `- Nodes added: ${diff.summary.nodesAdded}`,
  `- Nodes removed: ${diff.summary.nodesRemoved}`,
  `- Nodes modified: ${diff.summary.nodesModified}`,
  `- Tabs added: ${diff.summary.tabsAdded}`,
  `- Tabs removed: ${diff.summary.tabsRemoved}`,
];

const escapeTableCell = (value: string): string =>
  value.replaceAll('\\', '\\\\').replaceAll('|', '\\|').replace(/\r?\n/g, '<br>');

const tableLines = (nodes: NodeDisplay[]): string[] => {
  const rows = ['| Node | Type | Tab |', '|------|------|-----|'];
  if (nodes.length === 0) {
    rows.push('| (none) | - | - |');
    return rows;
  }
  for (const node of nodes) {
    rows.push(
      `| ${escapeTableCell(node.name)} | ${escapeTableCell(node.type)} | ${escapeTableCell(
        node.tabLabel ?? '-',
      )} |`,
    );
  }
  return rows;
};

const buildModifiedLines = (diff: FlowDiffResult): string[] => {
  if (diff.modifiedNodes.length === 0) {
    return ['No modified nodes detected.'];
  }

  const lines: string[] = [];
  for (const node of diff.modifiedNodes) {
    lines.push('');
    const label = node.after.name || node.before.name;
    lines.push(`### ${label} (${node.after.type})`);
    if (node.idChanged) {
      lines.push(`- ID changed: ${node.before.id} → ${node.after.id}`);
    }
    if (node.configChanges.length > 0) {
      lines.push('**Configuration changed:**');
      for (const change of node.configChanges) {
        lines.push(`- ${change.key}: ${change.before} → ${change.after}`);
      }
    }
    if (node.codeDiff) {
      lines.push('**Code changed:**');
      lines.push('```diff');
      lines.push(node.codeDiff);
      lines.push('```');
    }
  }
  return lines;
};

export const generateFlowDiffMarkdown = (diff: FlowDiffResult, labels: DiffLabels): string => {
  const lines: string[] = [];
  lines.push('# Flow Changes');
  lines.push('');
  lines.push(`Comparing: ${labels.afterLabel} vs ${labels.beforeLabel}`);
  lines.push('');
  lines.push(...buildSummaryLines(diff));
  lines.push('');
  lines.push('## Added Nodes');
  lines.push(...tableLines(diff.addedNodes));
  lines.push('');
  lines.push('## Removed Nodes');
  lines.push(...tableLines(diff.removedNodes));
  lines.push('');
  lines.push('## Modified Nodes');
  lines.push(...buildModifiedLines(diff));

  return lines.join('\n');
};

export type { FlowDiffResult, NodeDiff, NodeDisplay, ConfigChange, FlowDiffSummary, DiffLabels };
