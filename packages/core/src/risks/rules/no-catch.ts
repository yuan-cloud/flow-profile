/**
 * RISK_NO_CATCH Rule
 *
 * Detects tabs that include output nodes but do not include
 * a catch node to handle errors.
 *
 * Full implementation in bead: flow-profile-v8.2-jni
 */

import { isOutputType } from '../../categorize/node-types.js';
import type { ParsedFlow } from '../../parser/types.js';
import type { DetectRiskOptions, RiskFinding, RiskRule } from '../types.js';

/**
 * Check if a tab has a catch node
 */
function tabHasCatch(flow: ParsedFlow, tabId: string): boolean {
  return flow.nodes.some((node) => node.z === tabId && node.type === 'catch');
}

/**
 * Get all output nodes without catch coverage
 */
function findUncaughtOutputs(
  flow: ParsedFlow,
): Array<{ id: string; name: string; tabId: string; type: string }> {
  const uncaught: Array<{ id: string; name: string; tabId: string; type: string }> = [];

  // Group nodes by tab
  const tabsWithoutCatch = new Set<string>();
  for (const tab of flow.tabs) {
    if (!tabHasCatch(flow, tab.id)) {
      tabsWithoutCatch.add(tab.id);
    }
  }

  // Find output nodes in tabs without catch
  for (const node of flow.nodes) {
    if (!node.z) continue;
    if (!tabsWithoutCatch.has(node.z)) continue;
    if (!isOutputType(node.type)) continue;

    uncaught.push({
      id: node.id,
      name: node.name ?? node.type,
      tabId: node.z,
      type: node.type,
    });
  }

  return uncaught;
}

export const noCatchRule: RiskRule = {
  id: 'RISK_NO_CATCH',
  name: 'No Catch Node',
  description: 'Detects flows that may throw errors without a catch node to handle them.',

  check(flow: ParsedFlow, _options?: DetectRiskOptions): RiskFinding[] {
    const uncaught = findUncaughtOutputs(flow);

    if (uncaught.length === 0) {
      return [];
    }

    // Group by tab for reporting
    const byTab = new Map<string, Array<{ id: string; name: string; type: string }>>();
    for (const node of uncaught) {
      const list = byTab.get(node.tabId) ?? [];
      list.push({ id: node.id, name: node.name, type: node.type });
      byTab.set(node.tabId, list);
    }

    const findings: RiskFinding[] = [];

    for (const [tabId, nodes] of byTab) {
      const tab = flow.tabsById.get(tabId);
      const tabName = tab?.label ?? tabId;
      const outputCount = nodes.length;
      const outputTypes = nodes.map((node) => node.type).join(', ');

      findings.push({
        id: 'RISK_NO_CATCH',
        severity: 'medium',
        confidence: 'high',
        title: `No catch node in flow "${tabName}"`,
        description: `Flow "${tabName}" contains ${outputCount} output node(s) but no catch node to handle errors.`,
        remediation:
          'Add a catch node to handle errors. Connect it to a debug node or error handler.',
        affectedNodes: nodes.map((n) => ({ id: n.id, name: n.name })),
        evidence: `Tab "${tabName}" has ${outputCount} output node(s) and no catch node. Output types: ${outputTypes}`,
      });
    }

    return findings;
  },
};
