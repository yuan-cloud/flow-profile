/**
 * Tests for test data factories
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  createBranchingFlow,
  createCircularFlow,
  createDebug,
  createEdge,
  createEmptyFlow,
  createFlowWithoutCatch,
  createFlowWithSecrets,
  createFlowWithSubflow,
  createFunction,
  createHttpIn,
  createLargeFlow,
  createLinearFlow,
  createNestedSubflows,
  createNode,
  createParsedFlow,
  createSubflowDef,
  createTab,
  createUnicodeFlow,
  resetIdCounter,
} from './index.js';

describe('Test Data Factories', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe('createNode', () => {
    it('creates a node with default values', () => {
      const node = createNode();
      expect(node.id).toMatch(/^node-\d+$/);
      expect(node.type).toBe('function');
      expect(node.x).toBe(100);
      expect(node.y).toBe(100);
    });

    it('creates a node with custom values', () => {
      const node = createNode({
        id: 'custom-id',
        type: 'debug',
        name: 'My Debug',
        z: 'tab-1',
      });
      expect(node.id).toBe('custom-id');
      expect(node.type).toBe('debug');
      expect(node.name).toBe('My Debug');
      expect(node.z).toBe('tab-1');
    });

    it('preserves raw fields', () => {
      const node = createNode({
        raw: { customField: 'custom-value' },
      });
      expect(node.raw.customField).toBe('custom-value');
    });
  });

  describe('createTab', () => {
    it('creates a tab with default values', () => {
      const tab = createTab();
      expect(tab.id).toMatch(/^tab-\d+$/);
      expect(tab.type).toBe('tab');
      expect(tab.label).toBe('Test Flow');
    });

    it('creates a tab with custom label', () => {
      const tab = createTab({ label: 'My Flow' });
      expect(tab.label).toBe('My Flow');
    });
  });

  describe('createEdge', () => {
    it('creates an edge with default port', () => {
      const edge = createEdge({ source: 'a', target: 'b' });
      expect(edge.source).toBe('a');
      expect(edge.target).toBe('b');
      expect(edge.sourcePort).toBe(0);
    });

    it('creates an edge with custom port', () => {
      const edge = createEdge({ source: 'a', target: 'b', sourcePort: 2 });
      expect(edge.sourcePort).toBe(2);
    });
  });

  describe('createSubflowDef', () => {
    it('creates a subflow definition with default I/O', () => {
      const subflow = createSubflowDef();
      expect(subflow.type).toBe('subflow');
      expect(subflow.in).toHaveLength(1);
      expect(subflow.out).toHaveLength(1);
    });

    it('creates a subflow with custom I/O counts', () => {
      const subflow = createSubflowDef({ inputCount: 2, outputCount: 3 });
      expect(subflow.in).toHaveLength(2);
      expect(subflow.out).toHaveLength(3);
    });
  });

  describe('createParsedFlow', () => {
    it('creates an empty flow by default', () => {
      const flow = createParsedFlow();
      expect(flow.tabs).toHaveLength(0);
      expect(flow.nodes).toHaveLength(0);
      expect(flow.edges).toHaveLength(0);
    });

    it('creates lookup maps correctly', () => {
      const tab = createTab({ id: 'tab-1' });
      const node = createNode({ id: 'node-1' });
      const flow = createParsedFlow({ tabs: [tab], nodes: [node] });

      expect(flow.tabsById.get('tab-1')).toBe(tab);
      expect(flow.nodesById.get('node-1')).toBe(node);
    });
  });

  describe('Scenario Builders', () => {
    it('createLinearFlow creates a valid linear flow', () => {
      const { flow, nodeIds } = createLinearFlow();
      expect(flow.tabs).toHaveLength(1);
      expect(flow.nodes).toHaveLength(3);
      expect(flow.edges).toHaveLength(2);
      expect(nodeIds.inject).toBeDefined();
      expect(nodeIds.func).toBeDefined();
      expect(nodeIds.debug).toBeDefined();
    });

    it('createBranchingFlow creates a valid branching flow', () => {
      const flow = createBranchingFlow();
      expect(flow.nodes).toHaveLength(5);
      expect(flow.edges).toHaveLength(4);
    });

    it('createFlowWithSubflow creates a flow with subflow reference', () => {
      const { flow, subflowId } = createFlowWithSubflow();
      expect(flow.subflowDefs).toHaveLength(1);
      expect(flow.subflowDefs[0].id).toBe(subflowId);
      const instance = flow.nodes.find((n) => n.type === `subflow:${subflowId}`);
      expect(instance).toBeDefined();
    });
  });

  describe('Risk Scenario Builders', () => {
    it('createFlowWithSecrets creates a flow with high-entropy strings', () => {
      const flow = createFlowWithSecrets();
      const func = flow.nodes[0];
      const prefix = String.fromCharCode(115, 107, 45, 112, 114, 111, 106);
      expect(func.raw.token).toContain(prefix);
    });

    it('createCircularFlow creates a flow with cycles', () => {
      const flow = createCircularFlow();
      expect(flow.nodes).toHaveLength(2);
      expect(flow.edges).toHaveLength(2);
      // Verify circular reference
      const [nodeA, nodeB] = flow.nodes;
      expect(nodeA.wires?.[0]).toContain(nodeB.id);
      expect(nodeB.wires?.[0]).toContain(nodeA.id);
    });

    it('createFlowWithoutCatch creates a flow without catch nodes', () => {
      const flow = createFlowWithoutCatch();
      const catchNodes = flow.nodes.filter((n) => n.type === 'catch');
      expect(catchNodes).toHaveLength(0);
    });
  });

  describe('Edge Case Builders', () => {
    it('createEmptyFlow creates a valid empty flow', () => {
      const flow = createEmptyFlow();
      expect(flow.tabs).toHaveLength(0);
      expect(flow.nodes).toHaveLength(0);
    });

    it('createUnicodeFlow handles Unicode correctly', () => {
      const flow = createUnicodeFlow();
      expect(flow.tabs[0].label).toContain('日本語');
      expect(flow.nodes[0].name).toContain('中文');
    });

    it('createLargeFlow creates specified number of nodes', () => {
      const flow = createLargeFlow(100);
      expect(flow.nodes).toHaveLength(100);
      expect(flow.edges).toHaveLength(99); // n-1 edges for chain
    });

    it('createNestedSubflows creates nested structure', () => {
      const flow = createNestedSubflows(3);
      expect(flow.subflowDefs).toHaveLength(3);
    });
  });

  describe('Specialized Node Builders', () => {
    it('createHttpIn creates an HTTP input node', () => {
      const node = createHttpIn({ url: '/api/users', method: 'post' });
      expect(node.type).toBe('http in');
      expect(node.raw.url).toBe('/api/users');
      expect(node.raw.method).toBe('post');
    });

    it('createFunction creates a function node', () => {
      const node = createFunction({ func: 'msg.payload = 42; return msg;' });
      expect(node.type).toBe('function');
      expect(node.raw.func).toContain('42');
    });

    it('createDebug creates a debug node', () => {
      const node = createDebug({ name: 'Inspector' });
      expect(node.type).toBe('debug');
      expect(node.name).toBe('Inspector');
    });
  });
});
