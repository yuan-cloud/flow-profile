/**
 * RISK_INJECTION_PRONE Rule
 *
 * Detects patterns that may be vulnerable to injection attacks,
 * such as external input flowing into template/function/exec nodes.
 */

import type { ParsedFlow } from '../../parser/types.js';
import type { DetectRiskOptions, RiskFinding, RiskRule } from '../types.js';

type NodeInfo = {
  id: string;
  name: string;
  type: string;
};

/** Node types that execute external commands */
const EXEC_TYPES = new Set(['exec', 'daemon']);

/** Node types that evaluate dynamic code */
const EVAL_TYPES = new Set(['function', 'template']);

/** Node types that receive external input */
const INPUT_TYPES = new Set(['http in', 'tcp in', 'websocket in']);

const MUSTACHE_PAYLOAD_PATTERN = /{{{?\s*(msg\.)?payload(\.[^}\s]+)?\s*}?}}/i;

const FUNCTION_DANGEROUS_PATTERNS = [
  /eval\s*\(/i,
  /new Function\s*\(/i,
  /\bexec\s*\(\s*(msg\.)?payload/i,
];

/**
 * Lookup node info
 */
function getNodeInfo(flow: ParsedFlow, nodeId: string): NodeInfo | null {
  const node = flow.nodesById.get(nodeId);
  if (!node) return null;
  return {
    id: node.id,
    name: node.name ?? node.type,
    type: node.type,
  };
}

/**
 * Build reverse adjacency list (target -> sources)
 */
function buildReverseAdjacency(flow: ParsedFlow): Map<string, string[]> {
  const reverse = new Map<string, string[]>();
  for (const edge of flow.edges) {
    const list = reverse.get(edge.target);
    if (list) {
      list.push(edge.source);
    } else {
      reverse.set(edge.target, [edge.source]);
    }
  }

  for (const [target, sources] of reverse) {
    const unique = Array.from(new Set(sources));
    unique.sort();
    reverse.set(target, unique);
  }

  return reverse;
}

/**
 * Find a deterministic input path (source -> sink) if one exists
 */
function buildPath(parents: Map<string, string | null>, start: string): string[] {
  const path: string[] = [];
  let cursor: string | null = start;
  while (cursor) {
    path.push(cursor);
    cursor = parents.get(cursor) ?? null;
  }
  return path;
}

function findInputPath(
  sinkId: string,
  reverseAdj: Map<string, string[]>,
  inputIds: Set<string>,
): string[] | null {
  if (inputIds.size === 0) return null;
  const parents = new Map<string, string | null>([[sinkId, null]]);
  const queue: string[] = [sinkId];

  for (let i = 0; i < queue.length; i += 1) {
    const current = queue[i];
    if (!current) continue;
    if (inputIds.has(current)) {
      return buildPath(parents, current);
    }

    const sources = reverseAdj.get(current) ?? [];
    for (const source of sources) {
      if (parents.has(source)) continue;
      parents.set(source, current);
      queue.push(source);
    }
  }

  return null;
}

function extractAffectedNodes(
  flow: ParsedFlow,
  pathIds: string[] | null,
  sink: NodeInfo,
): NodeInfo[] {
  if (!pathIds) return [sink];
  const nodes: NodeInfo[] = [];
  for (const id of pathIds) {
    const info = getNodeInfo(flow, id);
    if (info) nodes.push(info);
  }
  if (!nodes.some((node) => node.id === sink.id)) {
    nodes.push(sink);
  }
  return nodes;
}

function buildEvidence(flow: ParsedFlow, pathIds: string[] | null, suffix: string): string {
  if (!pathIds || pathIds.length === 0) return suffix;
  const pathLabels = pathIds.map((id) => flow.nodesById.get(id)?.name ?? id);
  return `${pathLabels.join(' -> ')}. ${suffix}`;
}

function templateUsesPayload(node: NodeInfo, flow: ParsedFlow): boolean {
  const raw = flow.nodesById.get(node.id)?.raw;
  // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
  const templateValue = typeof raw?.['template'] === 'string' ? raw['template'] : '';
  return MUSTACHE_PAYLOAD_PATTERN.test(templateValue);
}

function functionUsesDangerousCode(node: NodeInfo, flow: ParsedFlow): string | null {
  const raw = flow.nodesById.get(node.id)?.raw;
  // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
  const funcValue = typeof raw?.['func'] === 'string' ? raw['func'] : '';
  for (const pattern of FUNCTION_DANGEROUS_PATTERNS) {
    if (pattern.test(funcValue)) {
      return pattern.source;
    }
  }
  return null;
}

function buildExecFindings(
  flow: ParsedFlow,
  inputIds: Set<string>,
  reverseAdj: Map<string, string[]>,
) {
  const findings: RiskFinding[] = [];
  const execNodes = flow.nodes
    .filter((node) => EXEC_TYPES.has(node.type))
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const node of execNodes) {
    const sink = getNodeInfo(flow, node.id);
    if (!sink) continue;
    const pathIds = findInputPath(node.id, reverseAdj, inputIds);
    const evidence = buildEvidence(
      flow,
      pathIds,
      `Node type "${node.type}" can execute arbitrary commands`,
    );
    const affectedNodes = extractAffectedNodes(flow, pathIds, sink);

    findings.push({
      id: 'RISK_INJECTION_PRONE',
      severity: 'medium',
      confidence: 'low',
      title: `Command execution node: "${node.name ?? node.type}"`,
      description: `Node "${node.name ?? node.type}" (${node.type}) executes system commands, which can be dangerous if inputs are not sanitized.`,
      remediation:
        'Validate and sanitize all inputs before passing to exec nodes. Consider using allowlists for command parameters.',
      affectedNodes: affectedNodes.map((n) => ({ id: n.id, name: n.name })),
      evidence,
    });
  }

  return findings;
}

function buildEvalFindings(
  flow: ParsedFlow,
  inputIds: Set<string>,
  reverseAdj: Map<string, string[]>,
): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const evalNodes = flow.nodes
    .filter((node) => EVAL_TYPES.has(node.type))
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const node of evalNodes) {
    const sink = getNodeInfo(flow, node.id);
    if (!sink) continue;
    const pathIds = findInputPath(node.id, reverseAdj, inputIds);
    if (!pathIds) continue;

    if (node.type === 'template' && !templateUsesPayload(sink, flow)) {
      continue;
    }

    let evidenceSuffix = `${node.type} node connected to external input`;
    if (node.type === 'function') {
      const pattern = functionUsesDangerousCode(sink, flow);
      evidenceSuffix = pattern
        ? `Function contains risky pattern (${pattern}) with external input`
        : 'Function receives external input; review for dynamic code usage';
    }

    const evidence = buildEvidence(flow, pathIds, evidenceSuffix);
    const affectedNodes = extractAffectedNodes(flow, pathIds, sink);

    findings.push({
      id: 'RISK_INJECTION_PRONE',
      severity: 'medium',
      confidence: 'low',
      title: `Dynamic code with external input: "${node.name ?? node.type}"`,
      description: `Node "${node.name ?? node.type}" (${node.type}) evaluates dynamic content and receives input from an external source.`,
      remediation:
        'Validate and sanitize external inputs before using in function or template nodes. Avoid eval() patterns.',
      affectedNodes: affectedNodes.map((n) => ({ id: n.id, name: n.name })),
      evidence,
    });
  }

  return findings;
}

export const injectionProneRule: RiskRule = {
  id: 'RISK_INJECTION_PRONE',
  name: 'Injection Vulnerable Pattern',
  description: 'Detects patterns that may be vulnerable to injection attacks.',

  check(flow: ParsedFlow, _options?: DetectRiskOptions): RiskFinding[] {
    const inputIds = new Set(
      flow.nodes.filter((node) => INPUT_TYPES.has(node.type)).map((node) => node.id),
    );
    const reverseAdj = buildReverseAdjacency(flow);

    const findings = [
      ...buildExecFindings(flow, inputIds, reverseAdj),
      ...buildEvalFindings(flow, inputIds, reverseAdj),
    ];

    return findings;
  },
};
