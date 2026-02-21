import { calculateEntropy, isHighEntropy } from './entropy.js';
import { appendPath, type FieldMatchReason, getFieldMatchReason } from './patterns.js';

export type RedactionReason = FieldMatchReason | 'entropy';

export interface RedactionOptions {
  enabled?: boolean;
  strictMode?: boolean;
  entropyThreshold?: number;
  additionalPatterns?: RegExp[];
}

export interface RedactionEntry {
  fieldPath: string;
  reason: RedactionReason;
  originalLength: number;
  maskAssigned: string;
  entropyValue?: number;
}

export interface RedactionReport {
  entries: RedactionEntry[];
  totalRedacted: number;
}

export interface RedactionResult<T> {
  redacted: T;
  report: RedactionReport;
}

interface Candidate {
  path: string;
  value: string;
  reason: RedactionReason;
  entropyValue?: number;
}

const DEFAULT_OPTIONS: Required<RedactionOptions> = {
  enabled: true,
  strictMode: true,
  entropyThreshold: 4.5,
  additionalPatterns: [],
};

export function redactSecrets<T>(input: T, options: RedactionOptions = {}): RedactionResult<T> {
  const resolved = { ...DEFAULT_OPTIONS, ...options };

  if (!resolved.enabled) {
    return {
      redacted: cloneValue(input) as T,
      report: { entries: [], totalRedacted: 0 },
    };
  }

  const candidates = collectCandidates(input, resolved);
  const masksByValue = assignMasks(candidates);

  const redacted = applyRedaction(input, candidates, masksByValue) as T;
  const entries = buildReportEntries(candidates, masksByValue);

  return {
    redacted,
    report: {
      entries,
      totalRedacted: entries.length,
    },
  };
}

function collectCandidates(
  input: unknown,
  options: Required<RedactionOptions>,
): Map<string, Candidate> {
  const candidates = new Map<string, Candidate>();

  const recordCandidate = (
    path: string,
    value: string,
    reason: RedactionReason,
    entropyValue?: number,
  ) => {
    candidates.set(path, { path, value, reason, entropyValue });
  };

  const handleString = (value: string, path: string, fieldKey?: string) => {
    const reason = fieldKey ? getFieldMatchReason(fieldKey, options.additionalPatterns) : undefined;

    if (reason) {
      recordCandidate(path, value, reason);
      return;
    }

    if (options.strictMode && isHighEntropy(value, options.entropyThreshold)) {
      recordCandidate(path, value, 'entropy', calculateEntropy(value));
    }
  };

  const visitArray = (value: unknown[], path: string, fieldKey?: string) => {
    value.forEach((item, index) => {
      visit(item, appendPath(path, index), fieldKey);
    });
  };

  const visitObject = (value: Record<string, unknown>, path: string) => {
    for (const key of Object.keys(value)) {
      const nextPath = appendPath(path, key);
      visit(value[key], nextPath, key);
    }
  };

  const visit = (value: unknown, path: string, fieldKey?: string) => {
    if (typeof value === 'string') {
      handleString(value, path, fieldKey);
      return;
    }

    if (Array.isArray(value)) {
      visitArray(value, path, fieldKey);
      return;
    }

    if (value && typeof value === 'object') {
      visitObject(value as Record<string, unknown>, path);
    }
  };

  visit(input, '');
  return candidates;
}

function assignMasks(candidates: Map<string, Candidate>): Map<string, string> {
  const uniqueValues = new Set<string>();
  for (const candidate of candidates.values()) {
    uniqueValues.add(candidate.value);
  }

  const sortedValues = [...uniqueValues].sort();
  const masksByValue = new Map<string, string>();

  sortedValues.forEach((value, index) => {
    masksByValue.set(value, buildMask(index));
  });

  return masksByValue;
}

function buildMask(index: number): string {
  const group = Math.floor(index / 9);
  const number = (index % 9) + 1;
  const letter = toAlphabetGroup(group);
  return `SECRET_${letter}${number}`;
}

function toAlphabetGroup(group: number): string {
  let result = '';
  let current = group;

  do {
    result = String.fromCharCode(65 + (current % 26)) + result;
    current = Math.floor(current / 26) - 1;
  } while (current >= 0);

  return result;
}

function applyRedaction(
  input: unknown,
  candidates: Map<string, Candidate>,
  masksByValue: Map<string, string>,
): unknown {
  const visit = (value: unknown, path: string): unknown => {
    if (typeof value === 'string') {
      const candidate = candidates.get(path);
      if (candidate) {
        return masksByValue.get(candidate.value) ?? value;
      }
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item, index) => visit(item, appendPath(path, index)));
    }

    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(value)) {
        const nextPath = appendPath(path, key);
        result[key] = visit((value as Record<string, unknown>)[key], nextPath);
      }
      return result;
    }

    return value;
  };

  return visit(input, '');
}

function buildReportEntries(
  candidates: Map<string, Candidate>,
  masksByValue: Map<string, string>,
): RedactionEntry[] {
  const entries: RedactionEntry[] = [];

  const sortedPaths = [...candidates.keys()].sort();
  for (const path of sortedPaths) {
    const candidate = candidates.get(path);
    if (!candidate) {
      continue;
    }
    const mask = masksByValue.get(candidate.value) ?? 'SECRET_UNKNOWN';

    entries.push({
      fieldPath: candidate.path,
      reason: candidate.reason,
      originalLength: candidate.value.length,
      maskAssigned: mask,
      entropyValue: candidate.entropyValue,
    });
  }

  return entries;
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      result[key] = cloneValue((value as Record<string, unknown>)[key]);
    }
    return result as T;
  }
  return value;
}
