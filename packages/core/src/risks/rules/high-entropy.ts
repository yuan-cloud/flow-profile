/**
 * RISK_HIGH_ENTROPY Rule
 *
 * Detects high-entropy strings in node configurations
 * that may indicate hardcoded secrets.
 *
 * Full implementation in bead: flow-profile-v8.2-eet
 */

import type { ParsedFlow } from '../../parser/types.js';
import { calculateEntropy, shouldSkipEntropy } from '../../redact/entropy.js';
import { appendPath, getFieldMatchReason } from '../../redact/patterns.js';
import type { DetectRiskOptions, RiskFinding, RiskRule } from '../types.js';

/** Entropy threshold for flagging (Shannon entropy, max ~4.7 for base64) */
const ENTROPY_THRESHOLD = 4.5;

/**
 * Check if a field name indicates a sensitive value
 */
function isSensitiveField(fieldName: string): boolean {
  return Boolean(getFieldMatchReason(fieldName));
}

/**
 * Scan an object for high-entropy strings
 */
function scanForHighEntropy(
  obj: unknown,
  path: string,
  fieldKey: string | null,
  threshold: number,
  results: HighEntropyHit[],
): void {
  if (typeof obj === 'string') {
    const isSensitive = fieldKey ? isSensitiveField(fieldKey) : false;
    if (shouldSkipEntropy(obj, isSensitive)) return;

    const entropy = calculateEntropy(obj);

    if (entropy < threshold && !isSensitive) {
      return;
    }

    results.push({
      path,
      value: obj,
      entropy,
      isSensitiveField: isSensitive,
    });
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      scanForHighEntropy(item, appendPath(path, index), fieldKey, threshold, results);
    });
    return;
  }

  if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      scanForHighEntropy(value, appendPath(path, key), key, threshold, results);
    }
  }
}

type HighEntropyHit = {
  path: string;
  value: string;
  entropy: number;
  isSensitiveField: boolean;
};

function collectHighEntropyHits(input: unknown, threshold: number): HighEntropyHit[] {
  const results: HighEntropyHit[] = [];
  scanForHighEntropy(input, 'raw', null, threshold, results);
  return results;
}

function isDuplicateValue(seenValues: Set<string>, value: string): boolean {
  if (seenValues.has(value)) {
    return true;
  }
  seenValues.add(value);
  return false;
}

function severityFor(result: HighEntropyHit, threshold: number): RiskFinding['severity'] {
  return result.isSensitiveField && result.entropy >= threshold ? 'high' : 'medium';
}

function confidenceFor(result: HighEntropyHit, threshold: number): RiskFinding['confidence'] {
  return result.isSensitiveField && result.entropy >= threshold ? 'high' : 'medium';
}

function createFinding(
  node: ParsedFlow['nodes'][number],
  result: HighEntropyHit,
  threshold: number,
): RiskFinding {
  return {
    id: 'RISK_HIGH_ENTROPY',
    severity: severityFor(result, threshold),
    confidence: confidenceFor(result, threshold),
    title: `Potential secret in "${node.name ?? node.type}"`,
    description: `High-entropy string found in field "${result.path}" that may be a hardcoded secret.`,
    remediation:
      'Move secrets to environment variables or a secure credential store. Never hardcode secrets in flows.',
    affectedNodes: [{ id: node.id, name: node.name ?? node.type }],
    evidence: `Entropy: ${result.entropy.toFixed(2)} (threshold ${threshold}), Field: ${result.path}, Length: ${result.value.length} chars`,
  };
}

export const highEntropyRule: RiskRule = {
  id: 'RISK_HIGH_ENTROPY',
  name: 'High Entropy String',
  description: 'Detects high-entropy strings that may indicate hardcoded secrets.',

  check(flow: ParsedFlow, options?: DetectRiskOptions): RiskFinding[] {
    const findings: RiskFinding[] = [];
    const seenValues = new Set<string>();
    const threshold = options?.entropyThreshold ?? ENTROPY_THRESHOLD;

    for (const node of flow.nodes) {
      const results = collectHighEntropyHits(node.raw, threshold);

      for (const result of results) {
        if (isDuplicateValue(seenValues, result.value)) continue;
        findings.push(createFinding(node, result, threshold));
      }
    }

    return findings;
  },
};
