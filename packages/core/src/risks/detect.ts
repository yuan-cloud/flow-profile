/**
 * Static Risk Detection Engine
 *
 * Analyzes Node-RED flows for potential issues using
 * conservative heuristics. Findings recommend review,
 * not alarm - static analysis has limits.
 */

import type { ParsedFlow } from '../parser/types.js';
// Import individual rules (placeholder implementations for now)
import { highEntropyRule } from './rules/high-entropy.js';
import { infiniteLoopRule } from './rules/infinite-loop.js';
import { injectionProneRule } from './rules/injection-prone.js';
import { noCatchRule } from './rules/no-catch.js';
import type { DetectRiskOptions, RiskDetectionResult, RiskFinding, RiskRule } from './types.js';

/**
 * Compare findings for deterministic sorting
 */
function compareFinding(a: RiskFinding, b: RiskFinding): number {
  // Sort by rule ID first
  const idCompare = a.id.localeCompare(b.id);
  if (idCompare !== 0) return idCompare;

  // Then by first affected node ID
  const aFirstNode = a.affectedNodes[0]?.id ?? '';
  const bFirstNode = b.affectedNodes[0]?.id ?? '';
  return aFirstNode.localeCompare(bFirstNode);
}

/**
 * Registry of all available risk rules
 *
 * Rules are executed in order; add new rules here.
 */
const ruleRegistry: RiskRule[] = [
  noCatchRule,
  infiniteLoopRule,
  highEntropyRule,
  injectionProneRule,
];

/**
 * Get all registered rules
 */
export function getRules(): RiskRule[] {
  return [...ruleRegistry];
}

/**
 * Get a rule by ID
 */
export function getRuleById(id: string): RiskRule | undefined {
  return ruleRegistry.find((rule) => rule.id === id);
}

/**
 * Filter rules based on options
 */
function filterRules(rules: RiskRule[], options: DetectRiskOptions): RiskRule[] {
  let filtered = rules;

  if (options.onlyRules && options.onlyRules.length > 0) {
    const onlySet = new Set(options.onlyRules);
    filtered = filtered.filter((rule) => onlySet.has(rule.id));
  }

  if (options.skipRules && options.skipRules.length > 0) {
    const skipSet = new Set(options.skipRules);
    filtered = filtered.filter((rule) => !skipSet.has(rule.id));
  }

  return filtered;
}

/**
 * Detect risks in a parsed flow
 *
 * Executes all registered rules (or filtered subset) and
 * returns findings sorted deterministically.
 *
 * @param flow - The parsed flow to analyze
 * @param options - Detection options (filter rules, etc.)
 * @returns Detection result with findings and metadata
 */
export function detectRisks(
  flow: ParsedFlow,
  options: DetectRiskOptions = {},
): RiskDetectionResult {
  const rules = filterRules(ruleRegistry, options);
  const findings: RiskFinding[] = [];
  const rulesExecuted: string[] = [];

  // Execute each rule
  for (const rule of rules) {
    const ruleFindings = rule.check(flow, options);
    findings.push(...ruleFindings);
    rulesExecuted.push(rule.id);
  }

  // Sort findings for determinism
  findings.sort(compareFinding);

  return {
    findings,
    rulesExecuted,
    metadata: {
      timestamp: new Date().toISOString(),
      nodesAnalyzed: flow.nodes.length,
      rulesCount: rules.length,
    },
  };
}

/**
 * Simple detection returning just findings
 *
 * Convenience function for simple use cases.
 */
export function detectRisksSimple(
  flow: ParsedFlow,
  options: DetectRiskOptions = {},
): RiskFinding[] {
  return detectRisks(flow, options).findings;
}

/**
 * Safe version of detectRisks that catches errors
 */
export function safeDetectRisks(
  flow: ParsedFlow,
  options: DetectRiskOptions = {},
): { success: true; data: RiskDetectionResult } | { success: false; error: Error } {
  try {
    const data = detectRisks(flow, options);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
