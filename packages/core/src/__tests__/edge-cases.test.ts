import { describe, expect, it } from 'vitest';
import { expandSubflows } from '../expand/subflow.js';
import { parseFlow, safeParseFlow } from '../parser/parse.js';
import { detectRisksSimple } from '../risks/detect.js';

describe('Edge case handling', () => {
  it('handles empty flows without crashing', () => {
    const parsed = parseFlow([]);
    const expanded = expandSubflows(parsed);

    expect(parsed.tabs).toHaveLength(0);
    expect(parsed.nodes).toHaveLength(0);
    expect(parsed.edges).toHaveLength(0);
    expect(expanded.nodes).toHaveLength(0);
    expect(expanded.edges).toHaveLength(0);

    const findings = detectRisksSimple(parsed);
    expect(findings).toHaveLength(0);
  });

  it('handles flows with only config nodes', () => {
    const parsed = parseFlow([
      {
        id: 'config-1',
        type: 'mqtt-broker',
        name: 'Broker',
        broker: 'localhost',
      },
    ]);

    const expanded = expandSubflows(parsed);

    expect(parsed.configNodes).toHaveLength(1);
    expect(parsed.nodes).toHaveLength(0);
    expect(expanded.nodes).toHaveLength(0);
    expect(detectRisksSimple(parsed)).toHaveLength(0);
  });

  it('handles flows with only tabs', () => {
    const parsed = parseFlow([{ id: 'tab1', type: 'tab', label: 'Main' }]);

    expect(parsed.tabs).toHaveLength(1);
    expect(parsed.nodes).toHaveLength(0);
    expect(parsed.edges).toHaveLength(0);
  });

  it('returns structured errors for invalid input', () => {
    const result = safeParseFlow({ not: 'a flow' });
    expect(result.success).toBe(false);
  });

  it('handles very long node names', () => {
    const longName = 'node-'.padEnd(300, 'x');
    const parsed = parseFlow([
      { id: 'tab1', type: 'tab', label: 'Main' },
      { id: 'node1', type: 'inject', z: 'tab1', name: longName, x: 10, y: 10, wires: [] },
    ]);

    expect(parsed.nodes[0]?.name).toBe(longName);
  });

  it('handles circular subflow references (direct self-reference)', () => {
    // A subflow that contains an instance of itself
    const flow = [
      { id: 'tab1', type: 'tab', label: 'Main' },
      // Subflow definition
      { id: 'subflow-def', type: 'subflow', name: 'Recursive' },
      // Internal node that references the same subflow
      { id: 'internal-1', type: 'subflow:subflow-def', z: 'subflow-def', x: 10, y: 10, wires: [] },
      // Instance of the subflow on main tab
      { id: 'instance-1', type: 'subflow:subflow-def', z: 'tab1', x: 100, y: 100, wires: [] },
    ];

    const parsed = parseFlow(flow);
    const expanded = expandSubflows(parsed);

    // The circular reference should be detected and result in a boundary node
    const boundaryNodes = expanded.boundaryNodes.filter((bn) => bn.reason === 'circular_reference');
    expect(boundaryNodes.length).toBeGreaterThanOrEqual(1);
  });

  it('handles Unicode in node names and properties', () => {
    const parsed = parseFlow([
      { id: 'tab1', type: 'tab', label: '主要タブ' },
      {
        id: 'node1',
        type: 'function',
        z: 'tab1',
        name: '日本語ノード🎉',
        func: 'msg.payload = "你好世界";',
        x: 10,
        y: 10,
        wires: [],
      },
      {
        id: 'node2',
        type: 'debug',
        z: 'tab1',
        name: 'Ελληνικά مرحبا',
        x: 200,
        y: 10,
        wires: [],
      },
    ]);

    expect(parsed.tabs[0]?.label).toBe('主要タブ');
    expect(parsed.nodes[0]?.name).toBe('日本語ノード🎉');
    expect(parsed.nodes[1]?.name).toBe('Ελληνικά مرحبا');
  });

  it('handles deeply nested objects in node properties', () => {
    // Create a deeply nested object (20 levels deep)
    const createDeepObject = (depth: number): unknown => {
      if (depth === 0) return { value: 'leaf' };
      return { nested: createDeepObject(depth - 1) };
    };

    const deepProp = createDeepObject(20);

    const parsed = parseFlow([
      { id: 'tab1', type: 'tab', label: 'Main' },
      {
        id: 'node1',
        type: 'function',
        z: 'tab1',
        name: 'Deep Node',
        config: deepProp,
        x: 10,
        y: 10,
        wires: [],
      },
    ]);

    // Should parse without crashing
    expect(parsed.nodes).toHaveLength(1);
    expect(parsed.nodes[0]?.raw?.config).toBeDefined();
  });

  it('handles flows with 1000+ nodes', () => {
    const nodes: unknown[] = [{ id: 'tab1', type: 'tab', label: 'Large Flow' }];

    // Create 1000 connected nodes
    for (let i = 0; i < 1000; i++) {
      nodes.push({
        id: `node-${i}`,
        type: 'function',
        z: 'tab1',
        name: `Node ${i}`,
        x: (i % 50) * 200,
        y: Math.floor(i / 50) * 100,
        wires: i < 999 ? [[`node-${i + 1}`]] : [],
      });
    }

    const parsed = parseFlow(nodes);
    const expanded = expandSubflows(parsed);

    expect(parsed.nodes).toHaveLength(1000);
    expect(expanded.nodes).toHaveLength(1000);
    // Should have 999 edges (node-0 -> node-1 -> ... -> node-999)
    expect(parsed.edges).toHaveLength(999);
  });

  it('handles binary-like data in node properties', () => {
    // Base64 encoded data and buffer-like strings
    const base64Data = 'SGVsbG8gV29ybGQh'; // "Hello World!" in base64
    const bufferLike = '\x00\x01\x02\xff\xfe';

    const parsed = parseFlow([
      { id: 'tab1', type: 'tab', label: 'Main' },
      {
        id: 'node1',
        type: 'function',
        z: 'tab1',
        name: 'Binary Node',
        payload: base64Data,
        buffer: bufferLike,
        x: 10,
        y: 10,
        wires: [],
      },
    ]);

    expect(parsed.nodes[0]?.raw?.payload).toBe(base64Data);
    expect(parsed.nodes[0]?.raw?.buffer).toBe(bufferLike);
  });

  it('handles nodes with empty and missing properties', () => {
    const parsed = parseFlow([
      { id: 'tab1', type: 'tab', label: 'Main' },
      {
        id: 'node1',
        type: 'function',
        z: 'tab1',
        name: '', // empty string instead of null (schema rejects null)
        x: 10,
        y: 10,
        wires: [],
      },
    ]);

    // Should parse without crashing
    expect(parsed.nodes).toHaveLength(1);
    expect(parsed.nodes[0]?.name).toBe('');
  });

  it('handles indirect circular subflow references (A -> B -> A)', () => {
    const flow = [
      { id: 'tab1', type: 'tab', label: 'Main' },
      // Subflow A definition
      { id: 'subflow-a', type: 'subflow', name: 'Subflow A' },
      // Subflow B definition
      { id: 'subflow-b', type: 'subflow', name: 'Subflow B' },
      // Subflow A contains instance of B
      { id: 'a-internal', type: 'subflow:subflow-b', z: 'subflow-a', x: 10, y: 10, wires: [] },
      // Subflow B contains instance of A (circular!)
      { id: 'b-internal', type: 'subflow:subflow-a', z: 'subflow-b', x: 10, y: 10, wires: [] },
      // Instance on main tab
      { id: 'instance-1', type: 'subflow:subflow-a', z: 'tab1', x: 100, y: 100, wires: [] },
    ];

    const parsed = parseFlow(flow);
    // Should not crash or infinite loop
    const expanded = expandSubflows(parsed);

    // Should complete without hanging
    expect(expanded.nodes.length).toBeGreaterThan(0);
  });
});
