import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseFlow } from '../parser/parse.js';
import {
  type FlowElement,
  FlowElementSchema,
  FlowNodeSchema,
  NodeRedFlowSchema,
  parseNodeRedFlow,
  SubflowSchema,
} from './flow.js';

describe('Node-RED Flow Schemas', () => {
  describe('NodeRedFlowSchema', () => {
    it('should parse simple.json fixture', () => {
      const fixturePath = path.resolve(__dirname, '../../../../testdata/simple.json');
      const content = fs.readFileSync(fixturePath, 'utf-8');
      const data = JSON.parse(content) as unknown;

      const result = NodeRedFlowSchema.safeParse(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(4);
      }
    });

    it('should preserve unknown fields via passthrough', () => {
      const nodeWithCustomFields = [
        {
          id: 'test-1',
          type: 'inject',
          name: 'Test Node',
          customField: 'should be preserved',
          nestedCustom: { deep: 'value' },
        },
      ];

      const result = NodeRedFlowSchema.safeParse(nodeWithCustomFields);

      expect(result.success).toBe(true);
      if (result.success) {
        const node = result.data[0] as FlowElement & { customField?: string };
        expect(node.customField).toBe('should be preserved');
      }
    });

    it('should validate required fields', () => {
      const invalidNode = [{ type: 'inject' }]; // missing 'id'

      const result = NodeRedFlowSchema.safeParse(invalidNode);

      expect(result.success).toBe(false);
    });
  });

  describe('parseNodeRedFlow helper', () => {
    it('should provide detailed error messages on invalid input', () => {
      const invalidInput = [{ type: 'inject' }]; // missing 'id'

      expect(() => parseNodeRedFlow(invalidInput)).toThrow('Node-RED flow validation failed');
    });

    it('should return parsed flow on valid input', () => {
      const validInput = [{ id: '1', type: 'tab', label: 'Test Flow' }];

      const result = parseNodeRedFlow(validInput);

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('tab');
    });
  });
});

describe('flow resource contract', () => {
  // An accessor proves rejection precedes element validation without allocating a large payload.
  const oversized = () => {
    const values = new Array(50_001);
    Object.defineProperty(values, 0, {
      get() {
        throw new Error('oversized collection element was evaluated');
      },
    });
    return values;
  };

  const node = { id: 'n', type: 'debug' };
  const subflow = { id: 's', type: 'subflow' };
  const cases = [
    ['flow elements', () => NodeRedFlowSchema.safeParse(oversized())],
    ['node outputs', () => FlowNodeSchema.safeParse({ ...node, wires: oversized() })],
    ['node targets', () => FlowNodeSchema.safeParse({ ...node, wires: [oversized()] })],
    ['element outputs', () => FlowElementSchema.safeParse({ ...node, wires: oversized() })],
    ['element targets', () => FlowElementSchema.safeParse({ ...node, wires: [oversized()] })],
    ['element inputs', () => FlowElementSchema.safeParse({ ...node, in: oversized() })],
    ['element ports', () => FlowElementSchema.safeParse({ ...node, out: oversized() })],
    ['subflow inputs', () => SubflowSchema.safeParse({ ...subflow, in: oversized() })],
    ['subflow outputs', () => SubflowSchema.safeParse({ ...subflow, out: oversized() })],
    [
      'subflow input wires',
      () => SubflowSchema.safeParse({ ...subflow, in: [{ x: 0, y: 0, wires: oversized() }] }),
    ],
    [
      'subflow output wires',
      () => SubflowSchema.safeParse({ ...subflow, out: [{ x: 0, y: 0, wires: oversized() }] }),
    ],
  ] as const;

  it.each(cases)('rejects oversized %s before reading elements', (_label, parse) => {
    const result = parse();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues).toHaveLength(1);
  });

  it('bounds diagnostics even for invalid arrays below the collection cap', () => {
    const result = NodeRedFlowSchema.safeParse(Array.from({ length: 10_000 }, () => ({})));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeLessThanOrEqual(16);
      expect(result.error.issues[0]?.path[0]).toBe(0);
    }
  });

  it('does not validate later nodes after the first invalid node', () => {
    const later = {
      get id() {
        throw new Error('later node was validated');
      },
      type: 'debug',
    };
    expect(NodeRedFlowSchema.safeParse([{}, later]).success).toBe(false);
  });

  it('bounds unknown passthrough arrays and nesting before downstream processing', () => {
    expect(() => parseNodeRedFlow([{ ...node, payload: oversized() }])).toThrow('resource limits');
    let nested: unknown = null;
    for (let i = 0; i < 65; i++) nested = { child: nested };
    expect(() => parseNodeRedFlow([{ ...node, payload: nested }])).toThrow('resource limits');
  });

  it('counts repeated container references against the aggregate work budget', () => {
    const repeated = Array(1_001).fill(Array(1_999).fill(null));
    expect(() => parseNodeRedFlow([{ ...node, payload: repeated }])).toThrow('resource limits');
  });

  it('preserves a legitimate 40k-node chain and all its identifiers and edges', () => {
    const nodes = Array.from({ length: 40_000 }, (_, i) => ({
      id: `node-${i}`,
      type: 'debug',
      z: 'main',
      x: i,
      y: 0,
      wires: i < 39_999 ? [[`node-${i + 1}`]] : [],
    }));
    const result = parseFlow([{ id: 'main', type: 'tab', label: 'Main' }, ...nodes]);
    expect(result.tabs).toHaveLength(1);
    expect(result.nodes).toHaveLength(40_000);
    expect(new Set(result.nodes.map((value) => value.id)).size).toBe(40_000);
    expect(result.edges).toHaveLength(39_999);
  });

  it('preserves 40k default-shaped function exports across 1000 tabs', () => {
    const input: FlowElement[] = [];
    for (let tab = 0; tab < 1_000; tab++) {
      input.push({ id: `tab${tab}`, type: 'tab', label: `Line ${tab}`, disabled: false, info: '' });
      for (let index = 0; index < 40; index++) {
        input.push({
          id: `t${tab}n${index}`,
          type: 'function',
          z: `tab${tab}`,
          name: `Step ${index}`,
          func: 'return msg;',
          outputs: 1,
          timeout: 0,
          noerr: 0,
          initialize: '',
          finalize: '',
          libs: [],
          x: 100 + index * 10,
          y: 100,
          wires: index < 39 ? [[`t${tab}n${index + 1}`]] : [[]],
        });
      }
    }
    // Fable's R1 fixture: 1,291,000 structural units, not the earlier lean 40k export.
    expect(Buffer.byteLength(JSON.stringify(input), 'utf8')).toBe(7_943_691);
    expect(parseNodeRedFlow(input)).toEqual(input);
    const result = parseFlow(input);
    expect(result.nodes).toHaveLength(40_000);
    expect(result.tabs).toHaveLength(1_000);
    expect(result.edges).toHaveLength(39_000);
    expect(result.nodesById.get('t999n39')?.raw).toEqual(input.at(-1));
    expect(result.edges).toContainEqual({ source: 't0n0', sourcePort: 0, target: 't0n1' });
  }, 20_000);
});
