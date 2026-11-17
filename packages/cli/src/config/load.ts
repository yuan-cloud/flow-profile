import { existsSync } from 'node:fs';
import path from 'node:path';
import { readInputJsonFile } from '../input.js';

export type LintRuleLevel = 'error' | 'warn' | 'off';

export type LintConfig = {
  rules?: Record<string, LintRuleLevel>;
  strictMode?: boolean;
  entropyThreshold?: number;
  failOn?: LintRuleLevel | 'off';
};

const DEFAULT_CONFIG_FILES = ['.flowprofilerc.json', '.flowprofilerc'];

export async function loadLintConfig(configPath?: string): Promise<LintConfig | undefined> {
  const resolved = configPath ? path.resolve(configPath) : findDefaultConfig();
  if (!resolved) return undefined;

  let parsed: unknown;
  try {
    parsed = await readInputJsonFile(resolved);
  } catch (error) {
    throw new Error(`Invalid lint config JSON at ${resolved}: ${String(error)}`);
  }
  return normalizeLintConfig(parsed);
}

function findDefaultConfig(): string | undefined {
  for (const name of DEFAULT_CONFIG_FILES) {
    const fullPath = path.resolve(process.cwd(), name);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return undefined;
}

function normalizeLintConfig(value: unknown): LintConfig {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid lint config: expected object');
  }

  const raw = value as Record<string, unknown>;
  // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
  const rules = normalizeRuleLevels(raw['rules']);
  // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
  const strictMode = normalizeBoolean(raw['strictMode']);
  // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
  const entropyThreshold = normalizeNumber(raw['entropyThreshold']);
  // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket access.
  const failOn = normalizeRuleLevel(raw['failOn']);

  return {
    rules: rules ?? undefined,
    strictMode,
    entropyThreshold,
    failOn,
  };
}

function normalizeRuleLevels(value: unknown): Record<string, LintRuleLevel> | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const normalized: Record<string, LintRuleLevel> = {};

  for (const [key, entry] of Object.entries(raw)) {
    const level = normalizeRuleLevel(entry);
    if (level) {
      normalized[key] = level;
    }
  }

  return normalized;
}

function normalizeRuleLevel(value: unknown): LintRuleLevel | undefined {
  if (value === 'error' || value === 'warn' || value === 'off') {
    return value;
  }
  return undefined;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  return undefined;
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}
