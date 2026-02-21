import { categorizeNodes } from '../categorize/categorize.js';
import type { NodeCategory } from '../categorize/types.js';
import type { ParsedFlow } from '../parser/types.js';
import { canonicalStringify } from '../utils/canonical.js';

export interface AboutMyFlows {
  version: '1.0';
  summary: {
    tabCount: number;
    nodeCount: number;
    edgeCount: number;
    subflowCount: number;
    configNodeCount: number;
  };
  tabs: Array<{
    id: string;
    name: string;
    nodeCount: number;
    categories: Record<NodeCategory, number>;
  }>;
  subflows: Array<{
    id: string;
    name: string;
    nodeCount: number;
    usageCount: number;
  }>;
  nodeTypes: Array<{
    type: string;
    count: number;
    category: NodeCategory;
  }>;
  ioSurface: {
    inputs: Array<{ type: string; name: string; nodeId: string }>;
    outputs: Array<{ type: string; name: string; nodeId: string }>;
  };
}

export function buildAboutMyFlows(flow: ParsedFlow): AboutMyFlows {
  const categorized = categorizeNodes(flow);
  const categorizedById = new Map(categorized.map((node) => [node.id, node]));

  const tabs = flow.tabs.map((tab) => {
    const nodesInTab = flow.nodes.filter((node) => node.z === tab.id);
    const categories = createCategoryCounts();

    for (const node of nodesInTab) {
      const categorizedNode = categorizedById.get(node.id);
      if (categorizedNode) {
        categories[categorizedNode.category] += 1;
      }
    }

    return {
      id: tab.id,
      name: tab.label ?? tab.id,
      nodeCount: nodesInTab.length,
      categories,
    };
  });

  const subflows = flow.subflowDefs.map((subflow) => {
    const usageCount = flow.nodes.filter((node) => node.type === `subflow:${subflow.id}`).length;

    return {
      id: subflow.id,
      name: subflow.name ?? subflow.id,
      nodeCount: flow.nodes.filter((node) => node.z === subflow.id).length,
      usageCount,
    };
  });

  const nodeTypes = buildNodeTypes(categorized);

  const ioSurface = buildIoSurface(flow, categorizedById);

  return {
    version: '1.0',
    summary: {
      tabCount: flow.tabs.length,
      nodeCount: flow.nodes.length,
      edgeCount: flow.edges.length,
      subflowCount: flow.subflowDefs.length,
      configNodeCount: flow.configNodes.length,
    },
    tabs,
    subflows,
    nodeTypes,
    ioSurface,
  };
}

export function stringifyAboutMyFlows(flow: ParsedFlow, indent = 2): string {
  return canonicalStringify(buildAboutMyFlows(flow), { indent });
}

function createCategoryCounts(): Record<NodeCategory, number> {
  return {
    input: 0,
    output: 0,
    logic: 0,
    config: 0,
    subflow: 0,
  };
}

function buildNodeTypes(
  categorized: ReturnType<typeof categorizeNodes>,
): AboutMyFlows['nodeTypes'] {
  const counts = new Map<string, { type: string; category: NodeCategory; count: number }>();

  for (const node of categorized) {
    const key = `${node.type}|${node.category}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { type: node.type, category: node.category, count: 1 });
    }
  }

  return [...counts.values()].sort((a, b) => {
    const typeCompare = a.type.localeCompare(b.type);
    if (typeCompare !== 0) {
      return typeCompare;
    }
    return a.category.localeCompare(b.category);
  });
}

function buildIoSurface(
  flow: ParsedFlow,
  categorizedById: Map<string, ReturnType<typeof categorizeNodes>[number]>,
): AboutMyFlows['ioSurface'] {
  const inputs: AboutMyFlows['ioSurface']['inputs'] = [];
  const outputs: AboutMyFlows['ioSurface']['outputs'] = [];

  for (const node of flow.nodes) {
    const categorized = categorizedById.get(node.id);
    if (!categorized) {
      continue;
    }

    if (categorized.category === 'input') {
      inputs.push({
        type: node.type,
        name: node.name ?? node.type,
        nodeId: node.id,
      });
    }

    if (categorized.category === 'output') {
      outputs.push({
        type: node.type,
        name: node.name ?? node.type,
        nodeId: node.id,
      });
    }
  }

  inputs.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  outputs.sort((a, b) => a.nodeId.localeCompare(b.nodeId));

  return { inputs, outputs };
}
