import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseFlow, safeParseFlow } from './parse.js';

describe('Flow Parser', () => {
  describe('parseFlow', () => {
    it('should parse simple.json fixture', () => {
      const fixturePath = path.resolve(__dirname, '../../../../testdata/simple.json');
      const content = fs.readFileSync(fixturePath, 'utf-8');
      const data = JSON.parse(content) as unknown;

      const result = parseFlow(data);

      // Verify structure
      expect(result.tabs).toHaveLength(1);
      expect(result.nodes).toHaveLength(2); // inject and debug nodes
      expect(result.configNodes).toHaveLength(1); // mqtt-broker
      expect(result.subflowDefs).toHaveLength(0);
    });

    it('should derive edges from wires', () => {
      const fixturePath = path.resolve(__dirname, '../../../../testdata/simple.json');
      const content = fs.readFileSync(fixturePath, 'utf-8');
      const data = JSON.parse(content) as unknown;

      const result = parseFlow(data);

      // inject node should wire to debug node
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0]).toEqual({
        source: 'node1',
        sourcePort: 0,
        target: 'node2',
      });
    });

    it('should build nodesById lookup', () => {
      const fixturePath = path.resolve(__dirname, '../../../../testdata/simple.json');
      const content = fs.readFileSync(fixturePath, 'utf-8');
      const data = JSON.parse(content) as unknown;

      const result = parseFlow(data);

      expect(result.nodesById.get('node1')).toBeDefined();
      expect(result.nodesById.get('node1')?.type).toBe('inject');
      expect(result.nodesById.get('node2')).toBeDefined();
      expect(result.nodesById.get('node2')?.type).toBe('debug');
    });

    it('should build tabsById lookup', () => {
      const fixturePath = path.resolve(__dirname, '../../../../testdata/simple.json');
      const content = fs.readFileSync(fixturePath, 'utf-8');
      const data = JSON.parse(content) as unknown;

      const result = parseFlow(data);

      expect(result.tabsById.get('tab1')).toBeDefined();
      expect(result.tabsById.get('tab1')?.label).toBe('Flow 1');
    });

    it('should preserve raw data on nodes', () => {
      const fixturePath = path.resolve(__dirname, '../../../../testdata/simple.json');
      const content = fs.readFileSync(fixturePath, 'utf-8');
      const data = JSON.parse(content) as unknown;

      const result = parseFlow(data);
      const injectNode = result.nodesById.get('node1');

      // Custom fields should be preserved in raw
      expect(injectNode?.raw.payload).toBe('hello');
      expect(injectNode?.raw.payloadType).toBe('str');
    });

    it('should produce deterministic output', () => {
      const fixturePath = path.resolve(__dirname, '../../../../testdata/simple.json');
      const content = fs.readFileSync(fixturePath, 'utf-8');
      const data = JSON.parse(content) as unknown;

      // Parse twice
      const result1 = parseFlow(data);
      const result2 = parseFlow(data);

      // Compare serialized output (excluding Maps which don't serialize directly)
      const serialize = (r: typeof result1) =>
        JSON.stringify({
          tabs: r.tabs,
          nodes: r.nodes,
          edges: r.edges,
          subflowDefs: r.subflowDefs,
          configNodes: r.configNodes,
        });

      expect(serialize(result1)).toBe(serialize(result2));
    });

    it('should sort nodes by id', () => {
      // Create input with nodes in non-sorted order
      const input = [
        { id: 'tab1', type: 'tab', label: 'Test' },
        { id: 'z-node', type: 'inject', z: 'tab1', x: 100, y: 100 },
        { id: 'a-node', type: 'debug', z: 'tab1', x: 200, y: 100 },
        { id: 'm-node', type: 'function', z: 'tab1', x: 300, y: 100 },
      ];

      const result = parseFlow(input);

      expect(result.nodes[0]?.id).toBe('a-node');
      expect(result.nodes[1]?.id).toBe('m-node');
      expect(result.nodes[2]?.id).toBe('z-node');
    });

    it('should identify config nodes correctly', () => {
      const input = [
        { id: 'tab1', type: 'tab', label: 'Test' },
        { id: 'mqtt-broker', type: 'mqtt-broker', name: 'MQTT', broker: 'localhost' },
        { id: 'http-config', type: 'http-request-config', host: 'api.example.com' },
        { id: 'visual-node', type: 'inject', z: 'tab1', x: 100, y: 100 },
      ];

      const result = parseFlow(input);

      expect(result.configNodes).toHaveLength(2);
      expect(result.nodes).toHaveLength(1);
      expect(result.configNodes.map((n) => n.id).sort()).toEqual(['http-config', 'mqtt-broker']);
    });

    it('should throw on invalid input', () => {
      const invalidInput = [{ type: 'inject' }]; // missing id

      expect(() => parseFlow(invalidInput)).toThrow('Node-RED flow validation failed');
    });
  });

  describe('safeParseFlow', () => {
    it('should return success result on valid input', () => {
      const input = [{ id: 'tab1', type: 'tab', label: 'Test' }];

      const result = safeParseFlow(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tabs).toHaveLength(1);
      }
    });

    it('should return error result on invalid input', () => {
      const invalidInput = [{ type: 'inject' }]; // missing id

      const result = safeParseFlow(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('Node-RED flow validation failed');
      }
    });
  });
});
