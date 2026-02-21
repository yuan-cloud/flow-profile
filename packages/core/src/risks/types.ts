/**
 * Types for the static risk heuristics engine
 *
 * Design principles:
 * 1. Conservative heuristics - recommend review, do not alarm
 * 2. Always provide evidence - explain WHY we flagged something
 * 3. Include remediation - tell users what to do
 * 4. Label confidence - static analysis has limits
 */

import type { ParsedFlow } from '../parser/types.js';

/**
 * Severity levels for risk findings
 */
export type RiskSeverity = 'low' | 'medium' | 'high';

/**
 * Confidence levels for risk findings
 *
 * Static analysis has inherent limits - confidence indicates
 * how certain we are that this is a real issue.
 */
export type RiskConfidence = 'low' | 'medium' | 'high';

/**
 * A node affected by a risk finding
 */
export interface AffectedNode {
  /** Node ID */
  id: string;
  /** Human-friendly name (falls back to type if no name) */
  name: string;
}

/**
 * A risk finding from static analysis
 *
 * Each finding explains:
 * - WHAT we found (id, title)
 * - WHY it matters (description, severity)
 * - HOW certain we are (confidence)
 * - WHERE it is (affectedNodes)
 * - WHAT to do (remediation)
 * - WHY we flagged it (evidence)
 */
export interface RiskFinding {
  /** Rule identifier (e.g., 'RISK_NO_CATCH', 'RISK_INFINITE_LOOP') */
  id: string;
  /** Severity of the finding */
  severity: RiskSeverity;
  /** Confidence in the finding */
  confidence: RiskConfidence;
  /** Short title describing the risk */
  title: string;
  /** Detailed description of what was found */
  description: string;
  /** Actionable remediation guidance */
  remediation: string;
  /** Nodes affected by this risk */
  affectedNodes: AffectedNode[];
  /** Evidence explaining why this was flagged */
  evidence: string;
}

/**
 * A risk detection rule
 *
 * Each rule checks a ParsedFlow for a specific type of risk
 * and returns zero or more findings.
 */
export interface RiskRule {
  /** Unique rule identifier (e.g., 'RISK_NO_CATCH') */
  id: string;
  /** Human-readable rule name */
  name: string;
  /** Rule description */
  description: string;
  /** Check the flow for risks */
  check(flow: ParsedFlow, options?: DetectRiskOptions): RiskFinding[];
}

/**
 * Options for risk detection
 */
export interface DetectRiskOptions {
  /** Only run specific rules (by ID) */
  onlyRules?: string[];
  /** Skip specific rules (by ID) */
  skipRules?: string[];
  /** Override entropy threshold for rules that use it */
  entropyThreshold?: number;
}

/**
 * Result of risk detection
 */
export interface RiskDetectionResult {
  /** All findings from all rules */
  findings: RiskFinding[];
  /** Rules that were executed */
  rulesExecuted: string[];
  /** Execution metadata */
  metadata: {
    /** Timestamp of detection run */
    timestamp: string;
    /** Number of nodes analyzed */
    nodesAnalyzed: number;
    /** Number of rules executed */
    rulesCount: number;
  };
}
