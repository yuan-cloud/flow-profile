/**
 * Types for subflow expansion
 *
 * Subflow expansion makes the hidden visible by replacing subflow instances
 * with their internal nodes. Nested subflows get boundary markers instead
 * of full expansion (one-level-deep rule).
 */

import type { Edge, Node, ParsedFlow } from '../parser/types.js';

/**
 * A boundary marker node inserted when expansion stops
 *
 * This occurs when:
 * - Nested subflow (depth > 1)
 * - Missing subflow definition
 * - Self-referencing subflow (circular)
 */
export interface BoundaryNode {
  id: string;
  type: 'subflow-boundary';
  name: string;
  /** Original subflow definition ID */
  originalSubflowId: string;
  /** Reason why expansion stopped */
  reason: BoundaryReason;
  /** Position inherited from the subflow instance */
  x?: number;
  y?: number;
  /** Parent tab ID */
  z?: string;
}

/**
 * Reasons why a subflow boundary marker was inserted
 */
export type BoundaryReason =
  | 'depth_limit' // Nested subflow (depth > 1)
  | 'missing_definition' // Subflow definition not found
  | 'circular_reference'; // Self-referencing subflow

/**
 * Metadata about the expansion process
 */
export interface ExpansionMetadata {
  /** IDs of subflow instances that were expanded */
  expandedSubflows: string[];
  /** IDs of boundary marker nodes */
  boundaryNodes: string[];
  /** Namespace mapping: original ID -> namespaced ID */
  namespaceMap: Map<string, string>;
}

/**
 * An expanded node (either original or from subflow expansion)
 */
export interface ExpandedNode extends Node {
  /** If this node came from expansion, the subflow instance it came from */
  expandedFrom?: string;
  /** Whether this is a boundary marker */
  isBoundary?: boolean;
}

/**
 * The result of subflow expansion
 *
 * Extends ParsedFlow with expansion-specific metadata and the expanded
 * nodes/edges that replace subflow instances.
 */
export interface ExpandedFlow extends Omit<ParsedFlow, 'nodes' | 'edges'> {
  /** All nodes including expanded internal nodes */
  nodes: ExpandedNode[];
  /** All edges including rewired connections */
  edges: Edge[];
  /** Boundary nodes for nested/missing subflows */
  boundaryNodes: BoundaryNode[];
  /** Metadata about the expansion process */
  expansionMetadata: ExpansionMetadata;
}

/**
 * Options for subflow expansion
 */
export interface ExpandOptions {
  /** Maximum expansion depth (default: 1) */
  maxDepth?: number;
}
