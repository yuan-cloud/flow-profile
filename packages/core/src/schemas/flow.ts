import * as z from 'zod';

/**
 * Zod schemas for Node-RED flow parsing
 *
 * Node-RED flow exports contain an array of mixed objects:
 * - Flow/tab containers (type: 'tab')
 * - Individual nodes (various types)
 * - Subflow definitions (type: 'subflow')
 * - Config nodes (no x/y coordinates)
 *
 * Strategy: Use passthrough() to preserve unknown fields while validating core structure.
 */

/**
 * Core schema for Node-RED flow nodes
 * Uses passthrough() to preserve custom fields from 1000+ node types
 */
export const FlowNodeSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    z: z.string().optional(), // parent tab/flow reference
    name: z.string().optional(), // human-readable label
    wires: z.array(z.array(z.string())).optional(), // outbound connections
    x: z.number().optional(), // position (absent for config nodes)
    y: z.number().optional(), // position (absent for config nodes)
  })
  .passthrough(); // Preserve unknown fields for redaction/output

/**
 * Tab/Flow container schema
 */
export const FlowTabSchema = z
  .object({
    id: z.string(),
    type: z.literal('tab'),
    label: z.string().optional(),
    disabled: z.boolean().optional(),
    info: z.string().optional(),
  })
  .passthrough();

/**
 * Subflow definition schema
 */
export const SubflowSchema = z
  .object({
    id: z.string(),
    type: z.literal('subflow'),
    name: z.string().optional(),
    info: z.string().optional(),
    in: z
      .array(
        z.object({
          x: z.number(),
          y: z.number(),
          wires: z
            .array(
              z.object({
                id: z.string(),
              }),
            )
            .optional(),
        }),
      )
      .optional(),
    out: z
      .array(
        z.object({
          x: z.number(),
          y: z.number(),
          wires: z
            .array(
              z.object({
                id: z.string(),
                port: z.number().optional(),
              }),
            )
            .optional(),
        }),
      )
      .optional(),
  })
  .passthrough();

/**
 * Config node schema (nodes without visual position)
 */
export const ConfigNodeSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    // Config nodes typically don't have x, y, z, or wires
  })
  .passthrough();

/**
 * Simple flow element schema that handles all Node-RED types
 * Uses passthrough to preserve all unknown fields
 */
export const FlowElementSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    // Common optional fields
    name: z.string().optional(),
    z: z.string().optional(), // parent tab (not present on tabs/subflows)
    // Position fields (present on visual nodes)
    x: z.number().optional(),
    y: z.number().optional(),
    // Connection fields
    wires: z.array(z.array(z.string())).optional(),
    // Tab-specific fields
    label: z.string().optional(),
    disabled: z.boolean().optional(),
    info: z.string().optional(),
    // Subflow fields
    in: z.array(z.any()).optional(),
    out: z.array(z.any()).optional(),
  })
  .passthrough(); // Preserve all unknown fields

/**
 * Top-level Node-RED flow export schema
 * Always an array of mixed flow elements
 */
export const NodeRedFlowSchema = z.array(FlowElementSchema);

/**
 * Type inference for TypeScript usage
 */
export type FlowNode = z.infer<typeof FlowNodeSchema>;
export type FlowTab = z.infer<typeof FlowTabSchema>;
export type Subflow = z.infer<typeof SubflowSchema>;
export type ConfigNode = z.infer<typeof ConfigNodeSchema>;
export type FlowElement = z.infer<typeof FlowElementSchema>;
export type NodeRedFlow = z.infer<typeof NodeRedFlowSchema>;

/**
 * Validation helper with detailed error messages
 */
export function parseNodeRedFlow(input: unknown): NodeRedFlow {
  try {
    return NodeRedFlowSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      throw new Error(
        `Node-RED flow validation failed:\n${issues
          .map((i) => `  - ${i.path}: ${i.message} (${i.code})`)
          .join('\n')}`,
      );
    }
    throw error;
  }
}
