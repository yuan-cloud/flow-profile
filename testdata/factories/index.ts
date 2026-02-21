/**
 * Test data factories for flow-profile
 *
 * Builder functions for creating test data programmatically.
 * Use these instead of hardcoded JSON fixtures when possible.
 */

import type {
  Edge,
  Node,
  ParsedFlow,
  SubflowDef,
  Tab,
} from '../../packages/core/src/parser/types.js';

// ============================================================================
// ID Generation
// ============================================================================

let idCounter = 0;

/** Generate a unique ID for test data */
export function generateId(prefix = 'test'): string {
  return `${prefix}-${++idCounter}`;
}

/** Reset ID counter (call in beforeEach) */
export function resetIdCounter(): void {
  idCounter = 0;
}

// ============================================================================
// Node Builders
// ============================================================================

export interface NodeOptions {
  id?: string;
  type?: string;
  name?: string;
  z?: string;
  x?: number;
  y?: number;
  wires?: string[][];
  raw?: Record<string, unknown>;
}

/** Create a test node with sensible defaults */
export function createNode(options: NodeOptions = {}): Node {
  const id = options.id ?? generateId('node');
  return {
    id,
    type: options.type ?? 'function',
    name: options.name,
    z: options.z,
    x: options.x ?? 100,
    y: options.y ?? 100,
    wires: options.wires ?? [],
    raw: {
      id,
      type: options.type ?? 'function',
      name: options.name,
      z: options.z,
      x: options.x ?? 100,
      y: options.y ?? 100,
      wires: options.wires ?? [],
      ...options.raw,
    },
  };
}

/** Create an HTTP input node */
export function createHttpIn(
  options: Omit<NodeOptions, 'type'> & { url?: string; method?: string } = {},
): Node {
  return createNode({
    ...options,
    type: 'http in',
    raw: {
      url: options.url ?? '/api/test',
      method: options.method ?? 'get',
      ...options.raw,
    },
  });
}

/** Create an HTTP response node */
export function createHttpResponse(options: Omit<NodeOptions, 'type'> = {}): Node {
  return createNode({
    ...options,
    type: 'http response',
  });
}

/** Create a function node */
export function createFunction(options: Omit<NodeOptions, 'type'> & { func?: string } = {}): Node {
  return createNode({
    ...options,
    type: 'function',
    raw: {
      func: options.func ?? 'return msg;',
      ...options.raw,
    },
  });
}

/** Create a debug node */
export function createDebug(options: Omit<NodeOptions, 'type'> = {}): Node {
  return createNode({
    ...options,
    type: 'debug',
  });
}

/** Create an inject node */
export function createInject(options: Omit<NodeOptions, 'type'> = {}): Node {
  return createNode({
    ...options,
    type: 'inject',
  });
}

/** Create a change node */
export function createChange(
  options: Omit<NodeOptions, 'type'> & { rules?: unknown[] } = {},
): Node {
  return createNode({
    ...options,
    type: 'change',
    raw: {
      rules: options.rules ?? [],
      ...options.raw,
    },
  });
}

/** Create a subflow instance node */
export function createSubflowInstance(
  subflowId: string,
  options: Omit<NodeOptions, 'type'> = {},
): Node {
  return createNode({
    ...options,
    type: `subflow:${subflowId}`,
  });
}

// ============================================================================
// Tab Builders
// ============================================================================

export interface TabOptions {
  id?: string;
  label?: string;
  disabled?: boolean;
  info?: string;
  raw?: Record<string, unknown>;
}

/** Create a test tab (flow container) */
export function createTab(options: TabOptions = {}): Tab {
  const id = options.id ?? generateId('tab');
  return {
    id,
    type: 'tab',
    label: options.label ?? 'Test Flow',
    disabled: options.disabled,
    info: options.info,
    raw: {
      id,
      type: 'tab',
      label: options.label ?? 'Test Flow',
      disabled: options.disabled,
      info: options.info,
      ...options.raw,
    },
  };
}

// ============================================================================
// Edge Builders
// ============================================================================

export interface EdgeOptions {
  source: string;
  target: string;
  sourcePort?: number;
}

/** Create a test edge */
export function createEdge(options: EdgeOptions): Edge {
  return {
    source: options.source,
    sourcePort: options.sourcePort ?? 0,
    target: options.target,
  };
}

// ============================================================================
// Subflow Definition Builders
// ============================================================================

export interface SubflowDefOptions {
  id?: string;
  name?: string;
  info?: string;
  inputCount?: number;
  outputCount?: number;
  raw?: Record<string, unknown>;
}

/** Create a test subflow definition */
export function createSubflowDef(options: SubflowDefOptions = {}): SubflowDef {
  const id = options.id ?? generateId('subflow');
  const inputCount = options.inputCount ?? 1;
  const outputCount = options.outputCount ?? 1;

  return {
    id,
    type: 'subflow',
    name: options.name ?? 'Test Subflow',
    info: options.info,
    in: Array.from({ length: inputCount }, (_, i) => ({
      x: 50,
      y: 50 + i * 50,
      wires: [],
    })),
    out: Array.from({ length: outputCount }, (_, i) => ({
      x: 300,
      y: 50 + i * 50,
      wires: [],
    })),
    raw: {
      id,
      type: 'subflow',
      name: options.name ?? 'Test Subflow',
      info: options.info,
      ...options.raw,
    },
  };
}

// ============================================================================
// ParsedFlow Builders
// ============================================================================

export interface ParsedFlowOptions {
  tabs?: Tab[];
  nodes?: Node[];
  edges?: Edge[];
  subflowDefs?: SubflowDef[];
  configNodes?: Node[];
}

/** Create a test ParsedFlow structure */
export function createParsedFlow(options: ParsedFlowOptions = {}): ParsedFlow {
  const tabs = options.tabs ?? [];
  const nodes = options.nodes ?? [];
  const edges = options.edges ?? [];
  const subflowDefs = options.subflowDefs ?? [];
  const configNodes = options.configNodes ?? [];

  return {
    tabs,
    nodes,
    edges,
    subflowDefs,
    configNodes,
    nodesById: new Map(nodes.map((n) => [n.id, n])),
    tabsById: new Map(tabs.map((t) => [t.id, t])),
    subflowsById: new Map(subflowDefs.map((s) => [s.id, s])),
  };
}

// ============================================================================
// Scenario Builders (Complex Test Data)
// ============================================================================

/** Create a simple linear flow: inject -> function -> debug */
export function createLinearFlow(): {
  flow: ParsedFlow;
  nodeIds: { inject: string; func: string; debug: string };
} {
  const tab = createTab({ label: 'Linear Flow' });
  const inject = createInject({ z: tab.id, name: 'Trigger' });
  const func = createFunction({ z: tab.id, name: 'Process', wires: [[]] });
  const debug = createDebug({ z: tab.id, name: 'Output' });

  // Wire them together
  inject.wires = [[func.id]];
  inject.raw.wires = [[func.id]];
  func.wires = [[debug.id]];
  func.raw.wires = [[debug.id]];

  const edges = [
    createEdge({ source: inject.id, target: func.id }),
    createEdge({ source: func.id, target: debug.id }),
  ];

  return {
    flow: createParsedFlow({
      tabs: [tab],
      nodes: [inject, func, debug],
      edges,
    }),
    nodeIds: { inject: inject.id, func: func.id, debug: debug.id },
  };
}

/** Create a flow with branching: one input, multiple outputs */
export function createBranchingFlow(): ParsedFlow {
  const tab = createTab({ label: 'Branching Flow' });
  const input = createHttpIn({ z: tab.id, name: 'API Input' });
  const branch1 = createFunction({ z: tab.id, name: 'Branch 1' });
  const branch2 = createFunction({ z: tab.id, name: 'Branch 2' });
  const output1 = createDebug({ z: tab.id, name: 'Debug 1' });
  const output2 = createDebug({ z: tab.id, name: 'Debug 2' });

  input.wires = [[branch1.id, branch2.id]];
  input.raw.wires = [[branch1.id, branch2.id]];
  branch1.wires = [[output1.id]];
  branch1.raw.wires = [[output1.id]];
  branch2.wires = [[output2.id]];
  branch2.raw.wires = [[output2.id]];

  return createParsedFlow({
    tabs: [tab],
    nodes: [input, branch1, branch2, output1, output2],
    edges: [
      createEdge({ source: input.id, target: branch1.id }),
      createEdge({ source: input.id, target: branch2.id }),
      createEdge({ source: branch1.id, target: output1.id }),
      createEdge({ source: branch2.id, target: output2.id }),
    ],
  });
}

/** Create a flow with a subflow instance */
export function createFlowWithSubflow(): { flow: ParsedFlow; subflowId: string } {
  const subflowDef = createSubflowDef({ name: 'Data Processor' });
  const tab = createTab({ label: 'Main Flow' });
  const input = createInject({ z: tab.id, name: 'Start' });
  const subflowInstance = createSubflowInstance(subflowDef.id, { z: tab.id, name: 'Process Data' });
  const output = createDebug({ z: tab.id, name: 'Result' });

  input.wires = [[subflowInstance.id]];
  input.raw.wires = [[subflowInstance.id]];
  subflowInstance.wires = [[output.id]];
  subflowInstance.raw.wires = [[output.id]];

  return {
    flow: createParsedFlow({
      tabs: [tab],
      nodes: [input, subflowInstance, output],
      edges: [
        createEdge({ source: input.id, target: subflowInstance.id }),
        createEdge({ source: subflowInstance.id, target: output.id }),
      ],
      subflowDefs: [subflowDef],
    }),
    subflowId: subflowDef.id,
  };
}

// ============================================================================
// Risk Scenario Builders
// ============================================================================

/** Create a flow with hardcoded secrets (high entropy strings) */
export function createFlowWithSecrets(): ParsedFlow {
  const tab = createTab({ label: 'Secrets Flow' });
  const token = String.fromCharCode(
    115,
    107,
    45,
    112,
    114,
    111,
    106,
    45,
    120,
    75,
    57,
    109,
    78,
    50,
    112,
    76,
    56,
    113,
    82,
    53,
    116,
    89,
    55,
    119,
    90,
    51,
    118,
    66,
  );
  const apiKey = String.fromCharCode(
    65,
    75,
    73,
    65,
    73,
    79,
    83,
    70,
    79,
    68,
    78,
    78,
    55,
    69,
    88,
    65,
    77,
    80,
    76,
    69,
  );
  const func = createFunction({
    z: tab.id,
    name: 'Auth Handler',
    raw: {
      token,
      apiKey,
    },
  });

  return createParsedFlow({
    tabs: [tab],
    nodes: [func],
  });
}

/** Create a flow with circular dependencies (infinite loop risk) */
export function createCircularFlow(): ParsedFlow {
  const tab = createTab({ label: 'Circular Flow' });
  const nodeA = createFunction({ z: tab.id, name: 'Loop A' });
  const nodeB = createFunction({ z: tab.id, name: 'Loop B' });

  nodeA.wires = [[nodeB.id]];
  nodeA.raw.wires = [[nodeB.id]];
  nodeB.wires = [[nodeA.id]];
  nodeB.raw.wires = [[nodeA.id]];

  return createParsedFlow({
    tabs: [tab],
    nodes: [nodeA, nodeB],
    edges: [
      createEdge({ source: nodeA.id, target: nodeB.id }),
      createEdge({ source: nodeB.id, target: nodeA.id }),
    ],
  });
}

/** Create a flow with missing error handling (no catch node) */
export function createFlowWithoutCatch(): ParsedFlow {
  const tab = createTab({ label: 'No Catch Flow' });
  const input = createHttpIn({ z: tab.id, name: 'API Endpoint' });
  const func = createFunction({ z: tab.id, name: 'Risky Operation' });
  const response = createHttpResponse({ z: tab.id, name: 'Response' });

  input.wires = [[func.id]];
  input.raw.wires = [[func.id]];
  func.wires = [[response.id]];
  func.raw.wires = [[response.id]];

  return createParsedFlow({
    tabs: [tab],
    nodes: [input, func, response],
    edges: [
      createEdge({ source: input.id, target: func.id }),
      createEdge({ source: func.id, target: response.id }),
    ],
  });
}

// ============================================================================
// Edge Case Builders
// ============================================================================

/** Create an empty flow (no tabs, no nodes) */
export function createEmptyFlow(): ParsedFlow {
  return createParsedFlow();
}

/** Create a flow with Unicode names */
export function createUnicodeFlow(): ParsedFlow {
  const tab = createTab({ label: '日本語フロー 🚀' });
  const node = createFunction({
    z: tab.id,
    name: '中文节点 émoji 🎉',
  });

  return createParsedFlow({
    tabs: [tab],
    nodes: [node],
  });
}

/** Create a large flow for performance testing */
export function createLargeFlow(nodeCount: number): ParsedFlow {
  const tab = createTab({ label: 'Large Flow' });
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  for (let i = 0; i < nodeCount; i++) {
    const node = createFunction({
      z: tab.id,
      name: `Node ${i}`,
      x: (i % 10) * 200,
      y: Math.floor(i / 10) * 100,
    });
    nodes.push(node);

    // Chain nodes together
    if (i > 0) {
      const prevNode = nodes[i - 1];
      prevNode.wires = [[node.id]];
      prevNode.raw.wires = [[node.id]];
      edges.push(createEdge({ source: prevNode.id, target: node.id }));
    }
  }

  return createParsedFlow({
    tabs: [tab],
    nodes,
    edges,
  });
}

/** Create a deeply nested subflow structure */
export function createNestedSubflows(depth: number): ParsedFlow {
  const subflowDefs: SubflowDef[] = [];
  const tabs: Tab[] = [];
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Create subflow definitions from deepest to shallowest
  for (let i = depth - 1; i >= 0; i--) {
    const subflow = createSubflowDef({ name: `Level ${i} Subflow` });
    subflowDefs.push(subflow);

    if (i < depth - 1) {
      // Add instance of deeper subflow inside this one
      const deeperSubflow = subflowDefs[subflowDefs.length - 2];
      const instance = createSubflowInstance(deeperSubflow.id, {
        z: subflow.id,
        name: `Instance of ${deeperSubflow.name}`,
      });
      nodes.push(instance);
    }
  }

  // Create main tab with topmost subflow instance
  const mainTab = createTab({ label: 'Nested Subflows' });
  tabs.push(mainTab);

  const topSubflow = subflowDefs[subflowDefs.length - 1];
  const topInstance = createSubflowInstance(topSubflow.id, {
    z: mainTab.id,
    name: 'Top Level Instance',
  });
  nodes.push(topInstance);

  return createParsedFlow({
    tabs,
    nodes,
    edges,
    subflowDefs,
  });
}
