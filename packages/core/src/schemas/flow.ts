import * as z from 'zod';

/** Shared ingestion policy. Limits apply before validation, redaction or risk presentation. */
export const INPUT_LIMITS = Object.freeze({
  maxBytes: 32 * 1024 * 1024,
  maxArrayLength: 50_000,
  maxDepth: 64,
  maxStructuralUnits: 2_000_000,
  maxFiles: 128,
});

type InputLimitKind =
  | 'bytes'
  | 'array-length'
  | 'depth'
  | 'structure'
  | 'text'
  | 'accessor'
  | 'files';

export class InputLimitError extends Error {
  constructor(readonly kind: InputLimitKind) {
    super(`Input exceeds resource limits (${kind}).`);
    this.name = 'InputLimitError';
  }
}

type PendingValue = { value: unknown; depth: number };
type WorkBudget = { units: number; textUnits: number };

function addText(budget: WorkBudget, length: number): void {
  budget.textUnits += length;
  if (budget.textUnits > INPUT_LIMITS.maxBytes) throw new InputLimitError('text');
}

function addStructure(budget: WorkBudget, units: number): void {
  budget.units += units;
  if (budget.units > INPUT_LIMITS.maxStructuralUnits) throw new InputLimitError('structure');
}

function ownValue(value: object, key: PropertyKey): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor && !('value' in descriptor)) throw new InputLimitError('accessor');
  return descriptor?.value;
}

function appendChildren(
  value: object,
  depth: number,
  pending: PendingValue[],
  budget: WorkBudget,
): void {
  if (Array.isArray(value)) {
    if (value.length > INPUT_LIMITS.maxArrayLength) throw new InputLimitError('array-length');
    addStructure(budget, Math.max(1, value.length));
    for (let i = 0; i < value.length; i++) {
      pending.push({ value: ownValue(value, i), depth: depth + 1 });
    }
    return;
  }
  const keys = Object.keys(value);
  addStructure(budget, Math.max(1, keys.length * 2));
  for (const key of keys) {
    addText(budget, key.length);
    pending.push({ value: ownValue(value, key), depth: depth + 1 });
  }
}

/**
 * Iterative, bounded walk of JSON-shaped data, including passthrough metadata.
 * Count repeated references each time: downstream validation can visit each occurrence too.
 * A JSON container costs its opening token, commas and colons, matching the text preflight.
 */
export function assertInputLimits(input: unknown): void {
  const pending: PendingValue[] = [{ value: input, depth: 1 }];
  const budget: WorkBudget = { units: 0, textUnits: 0 };
  while (pending.length > 0) {
    const item = pending.pop();
    if (!item) break;
    const { value, depth } = item;
    if (typeof value === 'string') {
      addText(budget, value.length);
      continue;
    }
    if (!value || typeof value !== 'object') continue;
    if (depth > INPUT_LIMITS.maxDepth) throw new InputLimitError('depth');
    appendChildren(value, depth, pending, budget);
  }
}

function highSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

function lowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}

function utf8CodeUnitBytes(text: string, index: number): number {
  const code = text.charCodeAt(index);
  if (code <= 0x7f) return 1;
  if (code <= 0x7ff) return 2;
  if (highSurrogate(code) && lowSurrogate(text.charCodeAt(index + 1))) return 4;
  if (lowSurrogate(code) && highSurrogate(text.charCodeAt(index - 1))) return 0;
  return 3; // Includes an unpaired surrogate's UTF-8 replacement character.
}

type JsonScan = { depth: number; units: number; quoted: boolean; escaped: boolean };

/** May be shared across related inputs; callers can only lower the policy ceiling. */
export type InputStructureBudget = { structuralUnitsRemaining: number };

function advanceJsonScan(scan: JsonScan, code: number): void {
  if (scan.quoted) {
    if (scan.escaped) scan.escaped = false;
    else if (code === 92) scan.escaped = true;
    else if (code === 34) scan.quoted = false;
    return;
  }
  switch (code) {
    case 34:
      scan.quoted = true;
      break;
    case 91:
    case 123:
      scan.depth++;
      scan.units++;
      break;
    case 93:
    case 125:
      scan.depth--;
      break;
    case 44:
    case 58:
      scan.units++;
      break;
  }
}

/** Resource preflight, not a JSON parser. Quoted/escaped punctuation is data. */
export function parseInputJson(text: string, budget?: InputStructureBudget): unknown {
  if (typeof text !== 'string') throw new SyntaxError('Expected JSON text');
  const maxUnits = budget?.structuralUnitsRemaining ?? INPUT_LIMITS.maxStructuralUnits;
  if (
    !Number.isSafeInteger(maxUnits) ||
    maxUnits < 0 ||
    maxUnits > INPUT_LIMITS.maxStructuralUnits
  ) {
    throw new InputLimitError('structure');
  }
  if (text.length > INPUT_LIMITS.maxBytes) throw new InputLimitError('bytes');
  const scan: JsonScan = { depth: 0, units: 0, quoted: false, escaped: false };
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    bytes += utf8CodeUnitBytes(text, i);
    if (bytes > INPUT_LIMITS.maxBytes) throw new InputLimitError('bytes');
    advanceJsonScan(scan, text.charCodeAt(i));
    if (scan.depth > INPUT_LIMITS.maxDepth) throw new InputLimitError('depth');
    if (scan.units > maxUnits) throw new InputLimitError('structure');
  }
  const input: unknown = JSON.parse(text);
  assertInputLimits(input);
  if (budget) budget.structuralUnitsRemaining -= scan.units;
  return input;
}

/** Patched Zod checks the leading max before walking; validate children one at a time. */
function boundedArray<T extends z.ZodType>(element: T) {
  return z
    .array(z.unknown())
    .max(INPUT_LIMITS.maxArrayLength)
    .transform((values, context): Array<z.output<T>> => {
      try {
        assertInputLimits(values);
      } catch (error) {
        if (!(error instanceof InputLimitError)) throw error;
        context.addIssue({ code: 'custom', message: error.message });
        return z.NEVER;
      }
      const output: Array<z.output<T>> = [];
      for (const [index, value] of values.entries()) {
        const result = element.safeParse(value);
        if (!result.success) {
          // Bound diagnostics independently of collection length and object width.
          for (const issue of result.error.issues.slice(0, 16)) {
            context.addIssue({ ...issue, path: [index, ...issue.path] });
          }
          return z.NEVER;
        }
        output.push(result.data);
      }
      return output;
    });
}

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
    wires: boundedArray(boundedArray(z.string())).optional(), // outbound connections
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
    in: boundedArray(
      z.object({
        x: z.number(),
        y: z.number(),
        wires: boundedArray(
          z.object({
            id: z.string(),
          }),
        ).optional(),
      }),
    ).optional(),
    out: boundedArray(
      z.object({
        x: z.number(),
        y: z.number(),
        wires: boundedArray(
          z.object({
            id: z.string(),
            port: z.number().optional(),
          }),
        ).optional(),
      }),
    ).optional(),
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
    wires: boundedArray(boundedArray(z.string())).optional(),
    // Tab-specific fields
    label: z.string().optional(),
    disabled: z.boolean().optional(),
    info: z.string().optional(),
    // Subflow fields
    in: boundedArray(z.any()).optional(),
    out: boundedArray(z.any()).optional(),
  })
  .passthrough(); // Preserve all unknown fields

/**
 * Top-level Node-RED flow export schema
 * Always an array of mixed flow elements
 */
export const NodeRedFlowSchema = boundedArray(FlowElementSchema);

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
  assertInputLimits(input);
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
