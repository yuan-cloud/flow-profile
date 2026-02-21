import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { type FlowElement, NodeRedFlowSchema, parseNodeRedFlow } from './flow.js';

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
