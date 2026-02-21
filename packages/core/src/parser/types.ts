/**
 * Types for the parsed flow structure
 *
 * These types represent the normalized, queryable structure
 * that downstream transforms operate on.
 */

import type * as z from 'zod';
import type { FlowElementSchema } from '../schemas/flow.js';

/** Raw element type for preserving all fields */
type RawElement = z.infer<typeof FlowElementSchema>;

/**
 * A parsed Node-RED tab (flow container)
 */
export interface Tab {
  id: string;
  type: 'tab';
  label?: string;
  disabled?: boolean;
  info?: string;
  /** All original fields preserved */
  raw: RawElement;
}

/**
 * A parsed Node-RED node
 */
export interface Node {
  id: string;
  type: string;
  /** Parent tab ID (undefined for config nodes) */
  z?: string;
  name?: string;
  /** Position - undefined for config nodes */
  x?: number;
  y?: number;
  /** Raw wires array from original node */
  wires?: string[][];
  /** All original fields preserved */
  raw: RawElement;
}

/**
 * A derived edge from wires
 *
 * Node-RED stores wires as: `wires: [['node-1-id'], ['node-2-id']]`
 * where array index = output port index
 */
export interface Edge {
  /** Source node ID */
  source: string;
  /** Output port index (0-based) */
  sourcePort: number;
  /** Target node ID */
  target: string;
}

/**
 * A subflow definition
 */
export interface SubflowDef {
  id: string;
  type: 'subflow';
  name?: string;
  info?: string;
  /** Input ports */
  in?: Array<{
    x: number;
    y: number;
    wires?: Array<{ id: string }>;
  }>;
  /** Output ports */
  out?: Array<{
    x: number;
    y: number;
    wires?: Array<{ id: string; port?: number }>;
  }>;
  /** All original fields preserved */
  raw: RawElement;
}

/**
 * The main parsed flow structure
 *
 * This is the normalized, queryable representation of a Node-RED flow.
 * All arrays are sorted by ID for determinism.
 */
export interface ParsedFlow {
  /** Flow/tab containers, sorted by id */
  tabs: Tab[];
  /** All regular nodes (not tabs, not subflow defs), sorted by id */
  nodes: Node[];
  /** Derived edges from wires, sorted by (source, sourcePort, target) */
  edges: Edge[];
  /** Subflow definitions, sorted by id */
  subflowDefs: SubflowDef[];
  /** Config nodes (nodes without x/y coordinates), sorted by id */
  configNodes: Node[];
  /** Fast lookup: node ID -> Node */
  nodesById: Map<string, Node>;
  /** Fast lookup: tab ID -> Tab */
  tabsById: Map<string, Tab>;
  /** Fast lookup: subflow ID -> SubflowDef */
  subflowsById: Map<string, SubflowDef>;
}
