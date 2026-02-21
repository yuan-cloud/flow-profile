/**
 * Node Categorization
 *
 * Assigns a functional category to each node in a parsed flow.
 */

import type { Node, ParsedFlow } from '../parser/types.js';
import { isInputType, isOutputType, isSubflowReference } from './node-types.js';
import type { CategorizedNode, CategorySummary, NodeCategory } from './types.js';

/**
 * Categorize a single node
 *
 * @param node - The node to categorize
 * @returns The category and reason
 */
export function categorizeNode(node: Node): {
  category: NodeCategory;
  reason: CategorizedNode['categoryReason'];
} {
  // Config nodes have no position (identified in parser, but double-check)
  if (node.x === undefined && node.y === undefined) {
    return { category: 'config', reason: 'position_missing' };
  }

  // Subflow references
  if (isSubflowReference(node.type)) {
    return { category: 'subflow', reason: 'subflow_reference' };
  }

  // Known type lookups
  if (isInputType(node.type)) {
    return { category: 'input', reason: 'known_type' };
  }

  if (isOutputType(node.type)) {
    return { category: 'output', reason: 'known_type' };
  }

  // Default to logic for all other nodes
  return { category: 'logic', reason: 'default' };
}

/**
 * Categorize all nodes in a parsed flow
 *
 * @param flow - The parsed flow
 * @returns Array of categorized nodes
 */
export function categorizeNodes(flow: ParsedFlow): CategorizedNode[] {
  const result: CategorizedNode[] = [];

  // Categorize regular nodes
  for (const node of flow.nodes) {
    const { category, reason } = categorizeNode(node);
    result.push({
      id: node.id,
      type: node.type,
      category,
      name: node.name,
      categoryReason: reason,
    });
  }

  // Add config nodes (already identified by parser)
  for (const node of flow.configNodes) {
    result.push({
      id: node.id,
      type: node.type,
      category: 'config',
      name: node.name,
      categoryReason: 'position_missing',
    });
  }

  // Sort by ID for determinism
  result.sort((a, b) => a.id.localeCompare(b.id));

  return result;
}

/**
 * Create a summary of node categories
 *
 * @param categorized - Array of categorized nodes
 * @returns Category summary with counts and groupings
 */
export function createCategorySummary(categorized: CategorizedNode[]): CategorySummary {
  const byCategory: Record<NodeCategory, CategorizedNode[]> = {
    input: [],
    output: [],
    logic: [],
    config: [],
    subflow: [],
  };

  for (const node of categorized) {
    byCategory[node.category].push(node);
  }

  return {
    byCategory,
    counts: {
      input: byCategory.input.length,
      output: byCategory.output.length,
      logic: byCategory.logic.length,
      config: byCategory.config.length,
      subflow: byCategory.subflow.length,
    },
    total: categorized.length,
  };
}

/**
 * Categorize a parsed flow and return summary
 *
 * @param flow - The parsed flow
 * @returns Category summary
 */
export function categorizeFlow(flow: ParsedFlow): CategorySummary {
  const categorized = categorizeNodes(flow);
  return createCategorySummary(categorized);
}
