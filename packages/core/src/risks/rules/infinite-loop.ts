/**
 * RISK_INFINITE_LOOP Rule
 *
 * Detects cycles in the flow graph that do not include delay-type nodes.
 */

import type { ParsedFlow } from '../../parser/types.js';
import type { DetectRiskOptions, RiskFinding, RiskRule } from '../types.js';

interface NodeInfo {
  id: string;
  name: string;
  type: string;
}

const DELAY_NODE_TYPES = new Set<string>([
  'delay',
  'trigger',
  'rate-limit',
  'rate limit',
  'rate_limit',
]);

function isDelayType(nodeType: string | undefined): boolean {
  if (!nodeType) return false;
  return DELAY_NODE_TYPES.has(nodeType.toLowerCase());
}

function getNodeInfo(flow: ParsedFlow, nodeId: string): NodeInfo | null {
  const node = flow.nodesById.get(nodeId);
  if (!node) return null;
  return { id: node.id, name: node.name ?? node.type, type: node.type };
}

function buildAdjacencyList(flow: ParsedFlow): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const edge of flow.edges) {
    const list = adj.get(edge.source);
    if (list) {
      list.push(edge.target);
    } else {
      adj.set(edge.source, [edge.target]);
    }
  }

  for (const [nodeId, neighbors] of adj) {
    const unique = Array.from(new Set(neighbors));
    unique.sort();
    adj.set(nodeId, unique);
  }

  return adj;
}

function rotateCycle(ids: string[], startIndex: number): string[] {
  return ids.slice(startIndex).concat(ids.slice(0, startIndex));
}

function canonicalizeCycle(ids: string[]): string[] {
  if (ids.length <= 1) return ids.slice();

  const rotations: string[][] = [];
  for (let i = 0; i < ids.length; i += 1) {
    rotations.push(rotateCycle(ids, i));
  }

  const reversed = ids.slice().reverse();
  for (let i = 0; i < reversed.length; i += 1) {
    rotations.push(rotateCycle(reversed, i));
  }

  rotations.sort((a, b) => a.join('|').localeCompare(b.join('|')));
  return rotations[0] ?? ids.slice();
}

function cycleHasDelayNode(flow: ParsedFlow, ids: string[]): boolean {
  for (const id of ids) {
    const node = flow.nodesById.get(id);
    if (node && isDelayType(node.type)) return true;
  }
  return false;
}

function findCycles(flow: ParsedFlow): string[][] {
  const cycles: string[][] = [];
  const seen = new Set<string>();
  const adj = buildAdjacencyList(flow);
  const nodes = Array.from(flow.nodesById.keys()).sort();
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const stack: string[] = [];

  const recordCycle = (ids: string[]): void => {
    const canonical = canonicalizeCycle(ids);
    if (cycleHasDelayNode(flow, canonical)) return;
    const key = canonical.join('->');
    if (seen.has(key)) return;
    seen.add(key);
    cycles.push(canonical);
  };

  const dfs = (nodeId: string): void => {
    visited.add(nodeId);
    inStack.add(nodeId);
    stack.push(nodeId);

    const neighbors = adj.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (inStack.has(neighbor)) {
        const cycleStartIndex = stack.indexOf(neighbor);
        if (cycleStartIndex >= 0) {
          const cycle = stack.slice(cycleStartIndex);
          recordCycle(cycle);
        }
      }
    }

    stack.pop();
    inStack.delete(nodeId);
  };

  for (const nodeId of nodes) {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
    }
  }

  return cycles;
}

function createCycleFinding(nodes: NodeInfo[], ids: string[]): RiskFinding {
  const isSelfLoop = ids.length === 1;
  const names = nodes.map((n) => n.name).join(' -> ');
  const cyclePath = ids
    .concat(ids[0] ?? '')
    .filter(Boolean)
    .join(' -> ');

  return {
    id: 'RISK_INFINITE_LOOP',
    severity: 'high',
    confidence: 'medium',
    title: isSelfLoop
      ? `Self-loop detected: "${nodes[0]?.name ?? 'unknown'}"`
      : 'Circular dependency detected',
    description: isSelfLoop
      ? `Node "${nodes[0]?.name ?? 'unknown'}" wires directly back to itself without a delay.`
      : `A cycle exists in the flow without a delay node. Nodes: ${names}.`,
    remediation: 'Add a delay node in the loop or verify this is intentional.',
    affectedNodes: nodes,
    evidence: `Cycle found: ${cyclePath} (no delay)`,
  };
}

export const infiniteLoopRule: RiskRule = {
  id: 'RISK_INFINITE_LOOP',
  name: 'Potential Infinite Loop',
  description: 'Detects nodes that wire back to themselves or create tight cycles.',

  check(flow: ParsedFlow, _options?: DetectRiskOptions): RiskFinding[] {
    const cycles = findCycles(flow);
    const findings: RiskFinding[] = [];

    for (const ids of cycles) {
      const nodes: NodeInfo[] = [];
      let missingNode = false;
      for (const id of ids) {
        const info = getNodeInfo(flow, id);
        if (!info) {
          missingNode = true;
          break;
        }
        nodes.push(info);
      }
      if (missingNode) continue;
      findings.push(createCycleFinding(nodes, ids));
    }

    return findings;
  },
};
