/**
 * Subflow Expansion
 *
 * Expands subflow instances to show their internal structure.
 * One-level-deep expansion with boundary markers for nested subflows.
 *
 * Key features:
 * - ID namespacing to prevent collisions
 * - Wire rewiring for external/internal connections
 * - Deterministic output (same input → same output)
 */

import type { Edge, Node, ParsedFlow, SubflowDef } from '../parser/types.js';
import type {
  BoundaryNode,
  BoundaryReason,
  ExpandedFlow,
  ExpandedNode,
  ExpandOptions,
  ExpansionMetadata,
} from './types.js';

/**
 * Check if a node type is a subflow instance reference
 */
export function isSubflowInstance(nodeType: string): boolean {
  return nodeType.startsWith('subflow:');
}

/**
 * Extract subflow definition ID from a subflow instance type
 */
export function getSubflowDefId(nodeType: string): string | undefined {
  if (!isSubflowInstance(nodeType)) {
    return undefined;
  }
  return nodeType.slice('subflow:'.length);
}

/**
 * Create a namespaced ID for internal nodes
 * Format: `<instanceId>:<originalId>`
 */
function namespaceId(instanceId: string, originalId: string): string {
  return `${instanceId}:${originalId}`;
}

/**
 * Compare function for deterministic sorting by ID
 */
function compareById(a: { id: string }, b: { id: string }): number {
  return a.id.localeCompare(b.id);
}

/**
 * Compare function for deterministic edge sorting
 */
function compareEdges(a: Edge, b: Edge): number {
  const sourceCompare = a.source.localeCompare(b.source);
  if (sourceCompare !== 0) return sourceCompare;

  const portCompare = a.sourcePort - b.sourcePort;
  if (portCompare !== 0) return portCompare;

  return a.target.localeCompare(b.target);
}

/**
 * Get boundary name based on reason
 */
function getBoundaryName(reason: BoundaryReason, subflowDefId: string, nodeName?: string): string {
  if (reason === 'missing_definition') {
    return `Missing subflow definition: ${subflowDefId}`;
  }
  if (reason === 'circular_reference') {
    return `Circular reference: ${subflowDefId}`;
  }
  return `Nested subflow not expanded: ${nodeName ?? subflowDefId}`;
}

/**
 * Create a boundary marker node
 */
function createBoundaryNode(
  instanceNode: Node,
  subflowDefId: string,
  reason: BoundaryReason,
): BoundaryNode {
  return {
    id: `${instanceNode.id}:boundary`,
    type: 'subflow-boundary',
    name: getBoundaryName(reason, subflowDefId, instanceNode.name),
    originalSubflowId: subflowDefId,
    reason,
    x: instanceNode.x,
    y: instanceNode.y,
    z: instanceNode.z,
  };
}

/**
 * Get internal nodes that belong to a subflow definition
 */
function getInternalNodes(subflowNodesById: Map<string, Node[]>, subflowDefId: string): Node[] {
  return subflowNodesById.get(subflowDefId) ?? [];
}

/**
 * Detect all subflow definitions that are involved in circular references.
 * A subflow is circular if it contains (directly or indirectly) an instance of itself.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: traversal is clearer inline for now.
function detectCircularSubflows(
  subflowNodesById: Map<string, Node[]>,
  subflowDefIds: Set<string>,
): Set<string> {
  const circularIds = new Set<string>();

  // For each subflow, check if it can reach itself
  for (const defId of subflowDefIds) {
    const visited = new Set<string>();
    const stack = [defId];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      if (visited.has(current)) continue;
      visited.add(current);

      const internalNodes = subflowNodesById.get(current) ?? [];
      for (const node of internalNodes) {
        if (!isSubflowInstance(node.type)) continue;

        const referencedId = getSubflowDefId(node.type);
        if (!referencedId) continue;

        // Found a cycle back to the original subflow
        if (referencedId === defId) {
          circularIds.add(defId);
          break;
        }

        // Continue traversal if this is a known subflow
        if (subflowDefIds.has(referencedId) && !visited.has(referencedId)) {
          stack.push(referencedId);
        }
      }

      if (circularIds.has(defId)) break;
    }
  }

  return circularIds;
}

/**
 * Process a nested subflow (at max depth) - create boundary marker
 */
function processNestedSubflow(
  internalNode: Node,
  instanceId: string,
  instanceZ: string | undefined,
): { expandedNode: ExpandedNode; namespaceEntry: [string, string] } {
  const nestedDefId = getSubflowDefId(internalNode.type) ?? 'unknown';
  const boundaryId = `${namespaceId(instanceId, internalNode.id)}:boundary`;

  const expandedNode: ExpandedNode = {
    id: boundaryId,
    type: 'subflow-boundary',
    name: getBoundaryName('depth_limit', nestedDefId, internalNode.name),
    x: internalNode.x,
    y: internalNode.y,
    z: instanceZ,
    raw: internalNode.raw,
    expandedFrom: instanceId,
    isBoundary: true,
  };

  return {
    expandedNode,
    namespaceEntry: [internalNode.id, boundaryId],
  };
}

/**
 * Process a regular internal node - namespace and expand
 */
function processInternalNode(
  internalNode: Node,
  instanceId: string,
  instanceZ: string | undefined,
): { expandedNode: ExpandedNode; namespaceEntry: [string, string] } {
  const namespacedId = namespaceId(instanceId, internalNode.id);

  const expandedNode: ExpandedNode = {
    id: namespacedId,
    type: internalNode.type,
    name: internalNode.name,
    x: internalNode.x,
    y: internalNode.y,
    z: instanceZ,
    wires: internalNode.wires,
    raw: internalNode.raw,
    expandedFrom: instanceId,
  };

  return {
    expandedNode,
    namespaceEntry: [internalNode.id, namespacedId],
  };
}

/**
 * Create namespaced edge from source to target
 */
function createNamespacedEdge(
  sourceId: string,
  targetId: string,
  portIndex: number,
  localNamespace: Map<string, string>,
): Edge | null {
  const sourceNamespaced = localNamespace.get(sourceId);
  const targetNamespaced = localNamespace.get(targetId);

  if (!sourceNamespaced || !targetNamespaced) {
    return null;
  }

  return {
    source: sourceNamespaced,
    sourcePort: portIndex,
    target: targetNamespaced,
  };
}

/**
 * Process wires for a single node and return edges
 */
function processNodeWires(node: Node, localNamespace: Map<string, string>): Edge[] {
  const edges: Edge[] = [];
  if (!node.wires) return edges;

  for (let portIndex = 0; portIndex < node.wires.length; portIndex++) {
    const targets = node.wires[portIndex];
    if (!targets || !Array.isArray(targets)) continue;

    for (const targetId of targets) {
      const edge = createNamespacedEdge(node.id, targetId, portIndex, localNamespace);
      if (edge) edges.push(edge);
    }
  }

  return edges;
}

/**
 * Rewire internal edges within the subflow
 */
function rewireInternalEdges(internalNodes: Node[], localNamespace: Map<string, string>): Edge[] {
  return internalNodes.flatMap((node) => processNodeWires(node, localNamespace));
}

/**
 * Rewire input connections (external → internal)
 */
function rewireInputEdges(
  subflowDef: SubflowDef,
  instanceId: string,
  edgesByTarget: Map<string, Edge[]>,
  localNamespace: Map<string, string>,
): Edge[] {
  const edges: Edge[] = [];

  if (!subflowDef.in || subflowDef.in.length === 0) {
    return edges;
  }

  const incomingEdges = edgesByTarget.get(instanceId) ?? [];
  for (const inputDef of subflowDef.in) {
    if (!inputDef?.wires) {
      continue;
    }

    for (const edge of incomingEdges) {
      for (const wire of inputDef.wires) {
        const targetNamespaced = localNamespace.get(wire.id);
        if (targetNamespaced) {
          edges.push({
            source: edge.source,
            sourcePort: edge.sourcePort,
            target: targetNamespaced,
          });
        }
      }
    }
  }

  return edges;
}

/**
 * Rewire output connections (internal → external)
 */
function rewireOutputEdges(
  subflowDef: SubflowDef,
  instanceNode: Node,
  localNamespace: Map<string, string>,
): Edge[] {
  const edges: Edge[] = [];

  if (!subflowDef.out || subflowDef.out.length === 0 || !instanceNode.wires) {
    return edges;
  }

  for (let outPort = 0; outPort < subflowDef.out.length; outPort++) {
    const outputDef = subflowDef.out[outPort];
    const externalTargets = instanceNode.wires[outPort];

    if (!outputDef?.wires || !externalTargets) continue;

    for (const wire of outputDef.wires) {
      const sourceNamespaced = localNamespace.get(wire.id);
      if (!sourceNamespaced) continue;

      for (const externalTarget of externalTargets) {
        edges.push({
          source: sourceNamespaced,
          sourcePort: wire.port ?? 0,
          target: externalTarget,
        });
      }
    }
  }

  return edges;
}

/**
 * Expand a single subflow instance
 */
function expandSubflowInstance(
  instanceNode: Node,
  subflowDef: SubflowDef,
  subflowNodesById: Map<string, Node[]>,
  edgesByTarget: Map<string, Edge[]>,
  depth: number,
  maxDepth: number,
): {
  expandedNodes: ExpandedNode[];
  newEdges: Edge[];
  namespaceEntries: Array<[string, string]>;
} {
  const instanceId = instanceNode.id;
  const namespaceEntries: Array<[string, string]> = [];
  const expandedNodes: ExpandedNode[] = [];

  const internalNodes = getInternalNodes(subflowNodesById, subflowDef.id);

  // Process each internal node
  for (const internalNode of internalNodes) {
    const isNested = isSubflowInstance(internalNode.type);
    const atMaxDepth = depth >= maxDepth;

    if (isNested && atMaxDepth) {
      const result = processNestedSubflow(internalNode, instanceId, instanceNode.z);
      expandedNodes.push(result.expandedNode);
      namespaceEntries.push(result.namespaceEntry);
    } else {
      const result = processInternalNode(internalNode, instanceId, instanceNode.z);
      expandedNodes.push(result.expandedNode);
      namespaceEntries.push(result.namespaceEntry);
    }
  }

  const localNamespace = new Map(namespaceEntries);

  // Collect all rewired edges
  const newEdges = [
    ...rewireInternalEdges(internalNodes, localNamespace),
    ...rewireInputEdges(subflowDef, instanceId, edgesByTarget, localNamespace),
    ...rewireOutputEdges(subflowDef, instanceNode, localNamespace),
  ];

  return { expandedNodes, newEdges, namespaceEntries };
}

/**
 * Handle a subflow instance that is part of a circular reference
 */
function handleCircularReference(
  node: Node,
  subflowDefId: string,
  edgesByTarget: Map<string, Edge[]>,
): {
  resultNode: ExpandedNode;
  resultEdges: Edge[];
  boundaryNode: BoundaryNode;
} {
  const boundary = createBoundaryNode(node, subflowDefId, 'circular_reference');

  const resultNode: ExpandedNode = {
    id: boundary.id,
    type: boundary.type,
    name: boundary.name,
    x: boundary.x,
    y: boundary.y,
    z: boundary.z,
    raw: node.raw,
    isBoundary: true,
  };

  const resultEdges: Edge[] = [];
  const incomingEdges = edgesByTarget.get(node.id) ?? [];
  for (const edge of incomingEdges) {
    resultEdges.push({
      source: edge.source,
      sourcePort: edge.sourcePort,
      target: boundary.id,
    });
  }

  return { resultNode, resultEdges, boundaryNode: boundary };
}

/**
 * Handle a subflow instance with missing definition
 */
function handleMissingDefinition(
  node: Node,
  subflowDefId: string,
  edgesByTarget: Map<string, Edge[]>,
): {
  resultNode: ExpandedNode;
  resultEdges: Edge[];
  boundaryNode: BoundaryNode;
} {
  const boundary = createBoundaryNode(node, subflowDefId, 'missing_definition');

  const resultNode: ExpandedNode = {
    id: boundary.id,
    type: boundary.type,
    name: boundary.name,
    x: boundary.x,
    y: boundary.y,
    z: boundary.z,
    raw: node.raw,
    isBoundary: true,
  };

  const resultEdges: Edge[] = [];
  const incomingEdges = edgesByTarget.get(node.id) ?? [];
  for (const edge of incomingEdges) {
    resultEdges.push({
      source: edge.source,
      sourcePort: edge.sourcePort,
      target: boundary.id,
    });
  }

  return { resultNode, resultEdges, boundaryNode: boundary };
}

/**
 * Filter edges not involving expanded instances
 */
function filterNonExpandedEdges(edges: Edge[], expandedIds: Set<string>): Edge[] {
  return edges.filter((e) => !expandedIds.has(e.source) && !expandedIds.has(e.target));
}

/**
 * Record expansion results into metadata
 */
function recordExpansion(
  expansion: { namespaceEntries: Array<[string, string]>; expandedNodes: ExpandedNode[] },
  metadata: ExpansionMetadata,
): void {
  for (const [original, namespaced] of expansion.namespaceEntries) {
    metadata.namespaceMap.set(original, namespaced);
  }
  for (const node of expansion.expandedNodes) {
    if (node.isBoundary) {
      metadata.boundaryNodes.push(node.id);
    }
  }
}

/**
 * Context for accumulating expansion results
 */
interface ExpansionContext {
  resultNodes: ExpandedNode[];
  resultEdges: Edge[];
  boundaryNodes: BoundaryNode[];
  expandedInstanceIds: Set<string>;
  metadata: ExpansionMetadata;
  /** Subflow definition IDs that are involved in circular references */
  circularSubflows: Set<string>;
}

/**
 * Process a single node during expansion
 */
function processNode(
  node: Node,
  parsed: ParsedFlow,
  subflowNodesById: Map<string, Node[]>,
  edgesByTarget: Map<string, Edge[]>,
  maxDepth: number,
  ctx: ExpansionContext,
): void {
  // Not a subflow instance - keep as is
  if (!isSubflowInstance(node.type)) {
    ctx.resultNodes.push({ ...node });
    return;
  }

  const subflowDefId = getSubflowDefId(node.type);
  if (!subflowDefId) {
    ctx.resultNodes.push({ ...node });
    return;
  }

  const subflowDef = parsed.subflowsById.get(subflowDefId);

  // Missing definition - create boundary
  if (!subflowDef) {
    const result = handleMissingDefinition(node, subflowDefId, edgesByTarget);
    ctx.boundaryNodes.push(result.boundaryNode);
    ctx.metadata.boundaryNodes.push(result.boundaryNode.id);
    ctx.resultNodes.push(result.resultNode);
    ctx.resultEdges.push(...result.resultEdges);
    return;
  }

  // Circular reference - create boundary instead of expanding
  if (ctx.circularSubflows.has(subflowDefId)) {
    const result = handleCircularReference(node, subflowDefId, edgesByTarget);
    ctx.boundaryNodes.push(result.boundaryNode);
    ctx.metadata.boundaryNodes.push(result.boundaryNode.id);
    ctx.resultNodes.push(result.resultNode);
    ctx.resultEdges.push(...result.resultEdges);
    return;
  }

  // Expand the subflow instance
  const expansion = expandSubflowInstance(
    node,
    subflowDef,
    subflowNodesById,
    edgesByTarget,
    1,
    maxDepth,
  );

  ctx.expandedInstanceIds.add(node.id);
  ctx.metadata.expandedSubflows.push(node.id);
  ctx.resultNodes.push(...expansion.expandedNodes);
  ctx.resultEdges.push(...expansion.newEdges);
  recordExpansion(expansion, ctx.metadata);
}

/**
 * Expand all subflow instances in a parsed flow
 *
 * One-level-deep expansion: subflows are expanded, but subflows
 * inside those subflows get boundary markers instead of expansion.
 */
export function expandSubflows(parsed: ParsedFlow, options: ExpandOptions = {}): ExpandedFlow {
  const maxDepth = options.maxDepth ?? 1;
  const allOriginalEdges = parsed.edges;
  const subflowDefIds = new Set(parsed.subflowDefs.map((subflow) => subflow.id));
  const subflowNodesById = new Map<string, Node[]>();
  const edgesByTarget = new Map<string, Edge[]>();

  for (const edge of allOriginalEdges) {
    const list = edgesByTarget.get(edge.target);
    if (list) {
      list.push(edge);
    } else {
      edgesByTarget.set(edge.target, [edge]);
    }
  }

  for (const node of parsed.nodes) {
    if (!node.z || !subflowDefIds.has(node.z)) continue;
    const list = subflowNodesById.get(node.z);
    if (list) {
      list.push(node);
    } else {
      subflowNodesById.set(node.z, [node]);
    }
  }

  // Detect circular subflow references upfront
  const circularSubflows = detectCircularSubflows(subflowNodesById, subflowDefIds);

  const ctx: ExpansionContext = {
    resultNodes: [],
    resultEdges: [],
    boundaryNodes: [],
    expandedInstanceIds: new Set(),
    metadata: {
      expandedSubflows: [],
      boundaryNodes: [],
      namespaceMap: new Map(),
    },
    circularSubflows,
  };

  // Process each node
  for (const node of parsed.nodes) {
    processNode(node, parsed, subflowNodesById, edgesByTarget, maxDepth, ctx);
  }

  // Add non-expanded edges
  ctx.resultEdges.push(...filterNonExpandedEdges(allOriginalEdges, ctx.expandedInstanceIds));

  // Sort for determinism
  ctx.resultNodes.sort(compareById);
  ctx.resultEdges.sort(compareEdges);
  ctx.boundaryNodes.sort(compareById);

  return {
    tabs: parsed.tabs,
    subflowDefs: parsed.subflowDefs,
    configNodes: parsed.configNodes,
    nodesById: parsed.nodesById,
    tabsById: parsed.tabsById,
    subflowsById: parsed.subflowsById,
    nodes: ctx.resultNodes,
    edges: ctx.resultEdges,
    boundaryNodes: ctx.boundaryNodes,
    expansionMetadata: ctx.metadata,
  };
}

/**
 * Safe version of expandSubflows that returns a result object
 */
export function safeExpandSubflows(
  parsed: ParsedFlow,
  options: ExpandOptions = {},
): { success: true; data: ExpandedFlow } | { success: false; error: Error } {
  try {
    const data = expandSubflows(parsed, options);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
