/**
 * Node categorization types
 *
 * Categories describe the role a node plays in a flow.
 */

/**
 * The functional category of a node
 */
export type NodeCategory = 'input' | 'output' | 'logic' | 'config' | 'subflow';

/**
 * A node with its assigned category
 */
export interface CategorizedNode {
  id: string;
  type: string;
  category: NodeCategory;
  name?: string;
  /** Why this category was assigned */
  categoryReason: 'known_type' | 'position_missing' | 'subflow_reference' | 'default';
}

/**
 * Summary of node categories in a flow
 */
export interface CategorySummary {
  /** Nodes by category */
  byCategory: Record<NodeCategory, CategorizedNode[]>;
  /** Count by category */
  counts: Record<NodeCategory, number>;
  /** Total nodes categorized */
  total: number;
}
