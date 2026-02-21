import * as fs from 'node:fs';
import * as path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseFlow } from '../parser/parse.js';
import type { ParsedFlow } from '../parser/types.js';
import {
  expandSubflows,
  getSubflowDefId,
  isSubflowInstance,
  safeExpandSubflows,
} from './subflow.js';

describe('Subflow Expansion', () => {
  // Load the test fixture
  const fixturePath = path.resolve(__dirname, '../../../../testdata/with-subflows.json');
  const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');
  const fixtureData = JSON.parse(fixtureContent) as unknown;

  describe('isSubflowInstance', () => {
    it('should return true for subflow references', () => {
      expect(isSubflowInstance('subflow:abc123')).toBe(true);
      expect(isSubflowInstance('subflow:my-subflow')).toBe(true);
    });

    it('should return false for regular node types', () => {
      expect(isSubflowInstance('inject')).toBe(false);
      expect(isSubflowInstance('debug')).toBe(false);
      expect(isSubflowInstance('function')).toBe(false);
      expect(isSubflowInstance('subflows')).toBe(false); // Doesn't start with "subflow:"
    });
  });

  describe('getSubflowDefId', () => {
    it('should extract subflow definition ID from type', () => {
      expect(getSubflowDefId('subflow:abc123')).toBe('abc123');
      expect(getSubflowDefId('subflow:my-subflow-def')).toBe('my-subflow-def');
    });

    it('should return undefined for non-subflow types', () => {
      expect(getSubflowDefId('inject')).toBeUndefined();
      expect(getSubflowDefId('debug')).toBeUndefined();
    });
  });

  describe('expandSubflows', () => {
    let parsed: ParsedFlow;

    beforeAll(() => {
      parsed = parseFlow(fixtureData);
    });

    it('should parse the fixture successfully', () => {
      expect(parsed.tabs).toHaveLength(1);
      expect(parsed.subflowDefs).toHaveLength(2);
      expect(parsed.nodes.length).toBeGreaterThan(0);
    });

    it('should expand subflow instances', () => {
      const expanded = expandSubflows(parsed);

      // Should have expanded some subflow instances
      expect(expanded.expansionMetadata.expandedSubflows.length).toBeGreaterThan(0);

      // Check that subflow-instance-1 was expanded
      expect(expanded.expansionMetadata.expandedSubflows).toContain('subflow-instance-1');
    });

    it('should namespace internal node IDs', () => {
      const expanded = expandSubflows(parsed);

      // Find expanded nodes from subflow-instance-1
      const expandedFromInstance1 = expanded.nodes.filter(
        (n) => n.expandedFrom === 'subflow-instance-1',
      );

      expect(expandedFromInstance1.length).toBeGreaterThan(0);

      // Check that IDs are namespaced
      for (const node of expandedFromInstance1) {
        expect(node.id).toContain('subflow-instance-1:');
      }
    });

    it('should preserve original regular nodes', () => {
      const expanded = expandSubflows(parsed);

      // inject1, debug1, inject2, debug2, inject3, debug3 should still exist
      const inject1 = expanded.nodes.find((n) => n.id === 'inject1');
      const debug1 = expanded.nodes.find((n) => n.id === 'debug1');

      expect(inject1).toBeDefined();
      expect(debug1).toBeDefined();
    });

    it('should create boundary markers for nested subflows', () => {
      const expanded = expandSubflows(parsed);

      // The nested-subflow-instance should be expanded, and the inner subflow
      // should have a boundary marker
      expect(expanded.expansionMetadata.boundaryNodes.length).toBeGreaterThan(0);

      // Find a boundary node
      const boundaryNode = expanded.nodes.find((n) => n.isBoundary);
      expect(boundaryNode).toBeDefined();
      expect(boundaryNode?.type).toBe('subflow-boundary');
    });

    it('should rewire edges correctly', () => {
      const expanded = expandSubflows(parsed);

      // Check that there are edges from inject1 to expanded nodes
      const edgesFromInject1 = expanded.edges.filter((e) => e.source === 'inject1');

      // inject1 originally wires to subflow-instance-1
      // After expansion, should wire to the first internal node
      expect(edgesFromInject1.length).toBeGreaterThan(0);

      // At least one edge should target a namespaced node
      const hasNamespacedTarget = edgesFromInject1.some((e) =>
        e.target.includes('subflow-instance-1:'),
      );
      expect(hasNamespacedTarget).toBe(true);
    });

    it('should rewire all input definitions for multi-input subflows', () => {
      const flowWithMultiInput = [
        { id: 'tab1', type: 'tab', label: 'Test' },
        {
          id: 'subflow-multi',
          type: 'subflow',
          name: 'Multi Input',
          in: [
            { x: 50, y: 30, wires: [{ id: 'sf-in-1' }] },
            { x: 50, y: 80, wires: [{ id: 'sf-in-2' }] },
          ],
          out: [],
        },
        {
          id: 'sf-in-1',
          type: 'function',
          z: 'subflow-multi',
          name: 'In 1',
          x: 150,
          y: 30,
          wires: [[]],
          func: 'return msg;',
        },
        {
          id: 'sf-in-2',
          type: 'function',
          z: 'subflow-multi',
          name: 'In 2',
          x: 150,
          y: 80,
          wires: [[]],
          func: 'return msg;',
        },
        { id: 'inject1', type: 'inject', z: 'tab1', x: 100, y: 150, wires: [['instance1']] },
        { id: 'inject2', type: 'inject', z: 'tab1', x: 100, y: 200, wires: [['instance1']] },
        {
          id: 'instance1',
          type: 'subflow:subflow-multi',
          z: 'tab1',
          x: 250,
          y: 175,
          wires: [[]],
        },
      ];

      const parsedMulti = parseFlow(flowWithMultiInput);
      const expanded = expandSubflows(parsedMulti);

      const targetA = 'instance1:sf-in-1';
      const targetB = 'instance1:sf-in-2';

      const targetsFromInject1 = expanded.edges
        .filter((edge) => edge.source === 'inject1')
        .map((edge) => edge.target);
      const targetsFromInject2 = expanded.edges
        .filter((edge) => edge.source === 'inject2')
        .map((edge) => edge.target);

      expect(targetsFromInject1).toContain(targetA);
      expect(targetsFromInject1).toContain(targetB);
      expect(targetsFromInject2).toContain(targetA);
      expect(targetsFromInject2).toContain(targetB);
    });

    it('should produce deterministic output', () => {
      const expanded1 = expandSubflows(parsed);
      const expanded2 = expandSubflows(parsed);

      // Node IDs should be in same order
      expect(expanded1.nodes.map((n) => n.id)).toEqual(expanded2.nodes.map((n) => n.id));

      // Edge order should be the same
      expect(expanded1.edges).toEqual(expanded2.edges);

      // Boundary nodes should be the same
      expect(expanded1.boundaryNodes).toEqual(expanded2.boundaryNodes);
    });

    it('should handle multiple instances of the same subflow', () => {
      const expanded = expandSubflows(parsed);

      // Both subflow-instance-1 and subflow-instance-2 use the same subflow definition
      expect(expanded.expansionMetadata.expandedSubflows).toContain('subflow-instance-1');
      expect(expanded.expansionMetadata.expandedSubflows).toContain('subflow-instance-2');

      // Each should have uniquely namespaced nodes
      const fromInstance1 = expanded.nodes.filter((n) => n.expandedFrom === 'subflow-instance-1');
      const fromInstance2 = expanded.nodes.filter((n) => n.expandedFrom === 'subflow-instance-2');

      expect(fromInstance1.length).toBeGreaterThan(0);
      expect(fromInstance2.length).toBeGreaterThan(0);

      // IDs should be different
      const ids1 = fromInstance1.map((n) => n.id);
      const ids2 = fromInstance2.map((n) => n.id);
      for (const id of ids1) {
        expect(ids2).not.toContain(id);
      }
    });

    it('should move expanded nodes to the parent tab', () => {
      const expanded = expandSubflows(parsed);

      // Expanded nodes should have z = parent tab ID
      const expandedFromInstance1 = expanded.nodes.filter(
        (n) => n.expandedFrom === 'subflow-instance-1',
      );

      for (const node of expandedFromInstance1) {
        expect(node.z).toBe('tab1');
      }
    });
  });

  describe('safeExpandSubflows', () => {
    it('should return success for valid input', () => {
      const parsed = parseFlow(fixtureData);
      const result = safeExpandSubflows(parsed);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nodes.length).toBeGreaterThan(0);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle flow with no subflows', () => {
      const simpleFlow = [
        { id: 'tab1', type: 'tab', label: 'Test' },
        { id: 'node1', type: 'inject', z: 'tab1', x: 100, y: 100, wires: [['node2']] },
        { id: 'node2', type: 'debug', z: 'tab1', x: 200, y: 100, wires: [] },
      ];

      const parsed = parseFlow(simpleFlow);
      const expanded = expandSubflows(parsed);

      // Should have no expansion metadata
      expect(expanded.expansionMetadata.expandedSubflows).toHaveLength(0);
      expect(expanded.expansionMetadata.boundaryNodes).toHaveLength(0);

      // Nodes should be preserved
      expect(expanded.nodes).toHaveLength(2);
    });

    it('should create boundary marker for missing subflow definition', () => {
      const flowWithMissing = [
        { id: 'tab1', type: 'tab', label: 'Test' },
        {
          id: 'instance1',
          type: 'subflow:missing-def',
          z: 'tab1',
          x: 100,
          y: 100,
          wires: [],
        },
      ];

      const parsed = parseFlow(flowWithMissing);
      const expanded = expandSubflows(parsed);

      // Should have a boundary marker
      expect(expanded.expansionMetadata.boundaryNodes).toHaveLength(1);

      // Find the boundary node
      const boundary = expanded.nodes.find((n) => n.isBoundary);
      expect(boundary).toBeDefined();
      expect(boundary?.name).toContain('Missing subflow definition');
    });

    it('should handle empty subflow definition', () => {
      const flowWithEmpty = [
        { id: 'tab1', type: 'tab', label: 'Test' },
        {
          id: 'empty-subflow',
          type: 'subflow',
          name: 'Empty',
          in: [],
          out: [],
        },
        {
          id: 'instance1',
          type: 'subflow:empty-subflow',
          z: 'tab1',
          x: 100,
          y: 100,
          wires: [],
        },
      ];

      const parsed = parseFlow(flowWithEmpty);
      const expanded = expandSubflows(parsed);

      // Should expand successfully (no crash)
      expect(expanded.expansionMetadata.expandedSubflows).toContain('instance1');
    });
  });
});
