/**
 * Flow Parser and Normalizer
 *
 * Transforms raw Node-RED flow JSON into a structured, queryable graph.
 * All operations are deterministic - same input always produces same output.
 */

import { parseNodeRedFlow } from '../schemas/flow.js';
import type { Edge, Node, ParsedFlow, SubflowDef, Tab } from './types.js';

/**
 * Compare function for deterministic sorting by ID
 */
function compareById(a: { id: string }, b: { id: string }): number {
  return a.id.localeCompare(b.id);
}

/**
 * Compare function for deterministic edge sorting
 * Sorts by (source, sourcePort, target)
 */
function compareEdges(a: Edge, b: Edge): number {
  const sourceCompare = a.source.localeCompare(b.source);
  if (sourceCompare !== 0) return sourceCompare;

  const portCompare = a.sourcePort - b.sourcePort;
  if (portCompare !== 0) return portCompare;

  return a.target.localeCompare(b.target);
}

/**
 * Derive edges from a node's wires array
 *
 * Node-RED stores wires as: `wires: [['node-1-id', 'node-2-id'], ['node-3-id']]`
 * where array index = output port index
 */
function deriveEdges(node: Node): Edge[] {
  const edges: Edge[] = [];
  const wires = node.wires;

  if (!wires || !Array.isArray(wires)) {
    return edges;
  }

  for (let portIndex = 0; portIndex < wires.length; portIndex++) {
    const targets = wires[portIndex];
    if (!targets || !Array.isArray(targets)) {
      continue;
    }

    for (const targetId of targets) {
      if (typeof targetId === 'string') {
        edges.push({
          source: node.id,
          sourcePort: portIndex,
          target: targetId,
        });
      }
    }
  }

  return edges;
}

/**
 * Check if a node is a config node (no visual position)
 */
function isConfigNode(element: { x?: number; y?: number; type: string }): boolean {
  // Config nodes don't have x/y coordinates and are not tabs or subflows
  return (
    element.x === undefined &&
    element.y === undefined &&
    element.type !== 'tab' &&
    element.type !== 'subflow'
  );
}

/**
 * Parse and normalize a Node-RED flow export
 *
 * @param input - Raw flow JSON (array of flow elements)
 * @returns Structured ParsedFlow with all lookups built
 * @throws ZodError on invalid input
 */
export function parseFlow(input: unknown): ParsedFlow {
  // Validate and parse with Zod
  const elements = parseNodeRedFlow(input);

  // Initialize collections
  const tabs: Tab[] = [];
  const nodes: Node[] = [];
  const subflowDefs: SubflowDef[] = [];
  const configNodes: Node[] = [];
  const allEdges: Edge[] = [];

  // Maps for fast lookup
  const nodesById = new Map<string, Node>();
  const tabsById = new Map<string, Tab>();
  const subflowsById = new Map<string, SubflowDef>();

  // Process each element
  for (const element of elements) {
    if (element.type === 'tab') {
      // Tab/flow container
      const tab: Tab = {
        id: element.id,
        type: 'tab',
        label: element.label,
        disabled: element.disabled,
        info: element.info,
        raw: element,
      };
      tabs.push(tab);
      tabsById.set(tab.id, tab);
    } else if (element.type === 'subflow') {
      // Subflow definition
      const subflow: SubflowDef = {
        id: element.id,
        type: 'subflow',
        name: element.name,
        info: element.info,
        in: element.in as SubflowDef['in'],
        out: element.out as SubflowDef['out'],
        raw: element,
      };
      subflowDefs.push(subflow);
      subflowsById.set(subflow.id, subflow);
    } else if (isConfigNode(element)) {
      // Config node (no position)
      const node: Node = {
        id: element.id,
        type: element.type,
        z: element.z,
        name: element.name,
        wires: element.wires,
        raw: element,
      };
      configNodes.push(node);
      nodesById.set(node.id, node);
    } else {
      // Regular node with position
      const node: Node = {
        id: element.id,
        type: element.type,
        z: element.z,
        name: element.name,
        x: element.x,
        y: element.y,
        wires: element.wires,
        raw: element,
      };
      nodes.push(node);
      nodesById.set(node.id, node);

      // Derive edges from wires
      const nodeEdges = deriveEdges(node);
      allEdges.push(...nodeEdges);
    }
  }

  // Sort all arrays for determinism
  tabs.sort(compareById);
  nodes.sort(compareById);
  subflowDefs.sort(compareById);
  configNodes.sort(compareById);
  allEdges.sort(compareEdges);

  return {
    tabs,
    nodes,
    edges: allEdges,
    subflowDefs,
    configNodes,
    nodesById,
    tabsById,
    subflowsById,
  };
}

/**
 * Safe version of parseFlow that returns a result object
 *
 * @param input - Raw flow JSON
 * @returns { success: true, data: ParsedFlow } or { success: false, error: Error }
 */
export function safeParseFlow(
  input: unknown,
): { success: true; data: ParsedFlow } | { success: false; error: Error } {
  try {
    const data = parseFlow(input);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
