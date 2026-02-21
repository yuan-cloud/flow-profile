import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseFlow } from '../parser/parse.js';
import {
  categorizeFlow,
  categorizeNode,
  categorizeNodes,
  createCategorySummary,
} from './categorize.js';
import { isInputType, isOutputType, isSubflowReference } from './node-types.js';

describe('Node Categorization', () => {
  describe('isInputType', () => {
    it('should identify http in as input', () => {
      expect(isInputType('http in')).toBe(true);
      expect(isInputType('http-in')).toBe(true);
    });

    it('should identify inject as input', () => {
      expect(isInputType('inject')).toBe(true);
    });

    it('should not identify debug as input', () => {
      expect(isInputType('debug')).toBe(false);
    });
  });

  describe('isOutputType', () => {
    it('should identify debug as output', () => {
      expect(isOutputType('debug')).toBe(true);
    });

    it('should identify http response as output', () => {
      expect(isOutputType('http response')).toBe(true);
      expect(isOutputType('http-response')).toBe(true);
    });

    it('should not identify function as output', () => {
      expect(isOutputType('function')).toBe(false);
    });
  });

  describe('isSubflowReference', () => {
    it('should identify subflow references', () => {
      expect(isSubflowReference('subflow:abc123')).toBe(true);
      expect(isSubflowReference('subflow:my-custom-flow')).toBe(true);
    });

    it('should not identify non-subflow types', () => {
      expect(isSubflowReference('function')).toBe(false);
      expect(isSubflowReference('subflowish')).toBe(false);
    });
  });

  describe('categorizeNode', () => {
    it('should categorize config nodes by missing position', () => {
      const node = {
        id: 'config1',
        type: 'mqtt-broker',
        raw: { id: 'config1', type: 'mqtt-broker' },
      };

      const result = categorizeNode(node);

      expect(result.category).toBe('config');
      expect(result.reason).toBe('position_missing');
    });

    it('should categorize subflow references', () => {
      const node = {
        id: 'sf1',
        type: 'subflow:abc123',
        x: 100,
        y: 100,
        raw: { id: 'sf1', type: 'subflow:abc123', x: 100, y: 100 },
      };

      const result = categorizeNode(node);

      expect(result.category).toBe('subflow');
      expect(result.reason).toBe('subflow_reference');
    });

    it('should categorize input nodes', () => {
      const node = {
        id: 'in1',
        type: 'inject',
        x: 100,
        y: 100,
        raw: { id: 'in1', type: 'inject', x: 100, y: 100 },
      };

      const result = categorizeNode(node);

      expect(result.category).toBe('input');
      expect(result.reason).toBe('known_type');
    });

    it('should categorize output nodes', () => {
      const node = {
        id: 'out1',
        type: 'debug',
        x: 100,
        y: 100,
        raw: { id: 'out1', type: 'debug', x: 100, y: 100 },
      };

      const result = categorizeNode(node);

      expect(result.category).toBe('output');
      expect(result.reason).toBe('known_type');
    });

    it('should default unknown types to logic', () => {
      const node = {
        id: 'unk1',
        type: 'my-custom-node',
        x: 100,
        y: 100,
        raw: { id: 'unk1', type: 'my-custom-node', x: 100, y: 100 },
      };

      const result = categorizeNode(node);

      expect(result.category).toBe('logic');
      expect(result.reason).toBe('default');
    });
  });

  describe('categorizeNodes', () => {
    it('should categorize nodes from simple.json', () => {
      const fixturePath = path.resolve(__dirname, '../../../../testdata/simple.json');
      const content = fs.readFileSync(fixturePath, 'utf-8');
      const flow = parseFlow(JSON.parse(content));

      const categorized = categorizeNodes(flow);

      // Should have 3 nodes: inject (input), debug (output), mqtt-broker (config)
      expect(categorized).toHaveLength(3);

      const inject = categorized.find((n) => n.type === 'inject');
      expect(inject?.category).toBe('input');

      const debug = categorized.find((n) => n.type === 'debug');
      expect(debug?.category).toBe('output');

      const broker = categorized.find((n) => n.type === 'mqtt-broker');
      expect(broker?.category).toBe('config');
    });

    it('should sort results by ID', () => {
      const flow = parseFlow([
        { id: 'tab1', type: 'tab', label: 'Test' },
        { id: 'z-node', type: 'function', z: 'tab1', x: 100, y: 100 },
        { id: 'a-node', type: 'inject', z: 'tab1', x: 100, y: 100 },
        { id: 'm-node', type: 'debug', z: 'tab1', x: 100, y: 100 },
      ]);

      const categorized = categorizeNodes(flow);

      expect(categorized[0]?.id).toBe('a-node');
      expect(categorized[1]?.id).toBe('m-node');
      expect(categorized[2]?.id).toBe('z-node');
    });
  });

  describe('createCategorySummary', () => {
    it('should create accurate summary', () => {
      const categorized = [
        {
          id: '1',
          type: 'inject',
          category: 'input' as const,
          categoryReason: 'known_type' as const,
        },
        {
          id: '2',
          type: 'inject',
          category: 'input' as const,
          categoryReason: 'known_type' as const,
        },
        {
          id: '3',
          type: 'debug',
          category: 'output' as const,
          categoryReason: 'known_type' as const,
        },
        {
          id: '4',
          type: 'function',
          category: 'logic' as const,
          categoryReason: 'default' as const,
        },
        {
          id: '5',
          type: 'mqtt-broker',
          category: 'config' as const,
          categoryReason: 'position_missing' as const,
        },
      ];

      const summary = createCategorySummary(categorized);

      expect(summary.counts.input).toBe(2);
      expect(summary.counts.output).toBe(1);
      expect(summary.counts.logic).toBe(1);
      expect(summary.counts.config).toBe(1);
      expect(summary.counts.subflow).toBe(0);
      expect(summary.total).toBe(5);
    });
  });

  describe('categorizeFlow', () => {
    it('should return full summary for parsed flow', () => {
      const fixturePath = path.resolve(__dirname, '../../../../testdata/simple.json');
      const content = fs.readFileSync(fixturePath, 'utf-8');
      const flow = parseFlow(JSON.parse(content));

      const summary = categorizeFlow(flow);

      expect(summary.total).toBe(3);
      expect(summary.counts.input).toBe(1);
      expect(summary.counts.output).toBe(1);
      expect(summary.counts.config).toBe(1);
    });
  });
});
