import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  canonicalStringify,
  detectRisks,
  getRules,
  parseFlow,
  type RiskFinding,
} from '@flow-profile/core';

import { type LintConfig, type LintRuleLevel, loadLintConfig } from '../config/load.js';

export type LintFinding = RiskFinding & {
  level: LintRuleLevel;
  filePath: string;
};

export type LintCommandOptions = {
  inputPath: string;
  configPath?: string;
  onlyRules?: string[];
  skipRules?: string[];
  failOn?: LintRuleLevel | 'off';
  format?: 'text' | 'json' | 'sarif';
  outputPath?: string;
  include?: string[];
  exclude?: string[];
  quiet?: boolean;
};

export type LintFileResult = {
  filePath: string;
  findings: LintFinding[];
  findingCount: number;
  errorCount: number;
  warningCount: number;
};

export type LintCommandResult = {
  findingCount: number;
  errorCount: number;
  warningCount: number;
  rulesExecuted: string[];
  findings: LintFinding[];
  files: LintFileResult[];
};

export class LintCommandError extends Error {
  readonly code: number;

  constructor(message: string, code: number) {
    super(message);
    this.name = 'LintCommandError';
    this.code = code;
  }
}

export async function runLintCommand(
  options: LintCommandOptions,
  config?: LintConfig,
): Promise<LintCommandResult> {
  if (!options.inputPath) {
    throw new LintCommandError('Missing input path', 1);
  }

  const resolvedConfig = config ?? (await loadLintConfig(options.configPath));
  const rules = normalizeRuleSelection(options, resolvedConfig);
  const inputFiles = await collectInputFiles(options.inputPath, options.include, options.exclude);
  if (inputFiles.length === 0) {
    throw new LintCommandError('No input files found', 1);
  }

  const files: LintFileResult[] = [];
  const allFindings: LintFinding[] = [];
  const rulesExecuted = new Set<string>();

  for (const filePath of inputFiles) {
    const parsedInput = await readInputJson(filePath);
    const flow = parseFlow(parsedInput);

    const result = detectRisks(flow, {
      onlyRules: rules.onlyRules,
      skipRules: rules.skipRules,
      entropyThreshold: resolvedConfig?.entropyThreshold,
    });

    for (const ruleId of result.rulesExecuted) {
      rulesExecuted.add(ruleId);
    }

    const findings = applyRuleLevels(result.findings, filePath, resolvedConfig);
    const errorCount = findings.filter((finding) => finding.level === 'error').length;
    const warningCount = findings.filter((finding) => finding.level === 'warn').length;

    files.push({
      filePath,
      findings,
      findingCount: findings.length,
      errorCount,
      warningCount,
    });

    allFindings.push(...findings);
  }

  const errorCount = files.reduce((total, file) => total + file.errorCount, 0);
  const warningCount = files.reduce((total, file) => total + file.warningCount, 0);

  return {
    findingCount: allFindings.length,
    errorCount,
    warningCount,
    rulesExecuted: [...rulesExecuted].sort((a, b) => a.localeCompare(b)),
    findings: allFindings,
    files,
  };
}

export function formatLintResult(result: LintCommandResult): string {
  return canonicalStringify(sanitizeLintResult(result), { indent: 2 });
}

function sanitizeLintResult(result: LintCommandResult): LintCommandResult {
  return {
    ...result,
    findings: result.findings.map((finding) => cloneLintFinding(finding)),
    files: result.files.map((file) => ({
      ...file,
      findings: file.findings.map((finding) => cloneLintFinding(finding)),
    })),
  };
}

function cloneLintFinding(finding: LintFinding): LintFinding {
  return {
    ...finding,
    affectedNodes: finding.affectedNodes.map((node) => ({ ...node })),
  };
}

export function computeLintExitCode(
  result: LintCommandResult,
  failOn: LintRuleLevel | 'off' = 'error',
): number {
  if (failOn === 'off') return 0;
  if (failOn === 'warn') {
    return result.errorCount + result.warningCount > 0 ? 2 : 0;
  }
  return result.errorCount > 0 ? 2 : 0;
}

export type LintArgsParseResult =
  | { ok: true; options: LintCommandOptions }
  | { ok: false; error: string };

export function parseLintArgs(argv: string[]): LintArgsParseResult {
  const state = createParseState();
  const args = [...argv];
  const consumeResult = consumeArgs(args, state);
  if (!consumeResult.ok) {
    return consumeResult;
  }

  if (!state.inputPath) {
    return { ok: false, error: 'Missing input path' };
  }

  return { ok: true, options: finalizeParseState(state) };
}

export function lintHelpText(): string {
  return [
    'flow-profile lint --in <path>',
    '',
    'Options:',
    '  --in <path>             Input flow JSON file or directory (required)',
    '  --config <path>         Path to .flowprofilerc.json',
    '  --only <ruleIds>        Comma-separated rule IDs to run',
    '  --skip <ruleIds>        Comma-separated rule IDs to skip',
    '  --fail-on <level>       Exit non-zero on error|warn findings (default: error)',
    '  --format <format>       Output format: text|json|sarif (default: text)',
    '  --output <path>         Write report to file instead of stdout',
    '  --json                  Alias for --format json',
    '  --include <globs>       Comma-separated glob patterns (default: **/*.json)',
    '  --exclude <globs>       Comma-separated glob patterns to exclude',
    '  --quiet                 Suppress non-error output',
    '  -h, --help              Show this help',
  ].join('\n');
}

type ParseState = {
  inputPath: string | null;
  configPath?: string;
  onlyRules?: string[];
  skipRules?: string[];
  failOn?: LintRuleLevel | 'off';
  format: 'text' | 'json' | 'sarif';
  outputPath?: string;
  include?: string[];
  exclude?: string[];
  quiet: boolean;
};

const createParseState = (): ParseState => ({
  inputPath: null,
  configPath: undefined,
  onlyRules: undefined,
  skipRules: undefined,
  failOn: undefined,
  format: 'text',
  outputPath: undefined,
  include: undefined,
  exclude: undefined,
  quiet: false,
});

const finalizeParseState = (state: ParseState): LintCommandOptions => ({
  inputPath: state.inputPath ?? '',
  configPath: state.configPath,
  onlyRules: state.onlyRules,
  skipRules: state.skipRules,
  failOn: state.failOn,
  format: state.format,
  outputPath: state.outputPath,
  include: state.include,
  exclude: state.exclude,
  quiet: state.quiet,
});

export function resolveLintFailOn(
  options: LintCommandOptions,
  config?: LintConfig,
): LintRuleLevel | 'off' {
  return options.failOn ?? config?.failOn ?? 'error';
}

const FLAG_HANDLERS: Record<string, (state: ParseState) => string | null> = {
  '-h': () => 'help',
  '--help': () => 'help',
  '--json': (state) => {
    state.format = 'json';
    return null;
  },
  '--quiet': (state) => {
    state.quiet = true;
    return null;
  },
};

const VALUE_HANDLERS: Record<string, (state: ParseState, value: string) => string | null> = {
  '--in': (state, value) => {
    if (state.inputPath) return 'Input path already provided';
    state.inputPath = value;
    return null;
  },
  '--config': (state, value) => {
    state.configPath = value;
    return null;
  },
  '--fail-on': (state, value) => {
    if (value !== 'error' && value !== 'warn' && value !== 'off') {
      return `Invalid fail-on level: ${value}`;
    }
    state.failOn = value;
    return null;
  },
  '--format': (state, value) => {
    if (value !== 'text' && value !== 'json' && value !== 'sarif') {
      return `Invalid format: ${value}`;
    }
    state.format = value;
    return null;
  },
  '--output': (state, value) => {
    state.outputPath = value;
    return null;
  },
  '--only': (state, value) => {
    state.onlyRules = splitList(value);
    return null;
  },
  '--skip': (state, value) => {
    state.skipRules = splitList(value);
    return null;
  },
  '--include': (state, value) => {
    state.include = splitList(value);
    return null;
  },
  '--exclude': (state, value) => {
    state.exclude = splitList(value);
    return null;
  },
};

type ConsumeResult = { ok: true } | { ok: false; error: string };

type TokenResult = { advance: number; error?: string };

const consumeArgs = (args: string[], state: ParseState): ConsumeResult => {
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token) continue;

    const next = args[index + 1];
    const result = handleToken(token, next, state);
    if (result.error) {
      return { ok: false, error: result.error };
    }
    index += result.advance - 1;
  }

  return { ok: true };
};

const handleToken = (token: string, next: string | undefined, state: ParseState): TokenResult => {
  const valueHandler = VALUE_HANDLERS[token];
  if (valueHandler) {
    if (!next) {
      return { advance: 1, error: `Missing value for ${token}` };
    }
    const error = valueHandler(state, next);
    return { advance: 2, error: error ?? undefined };
  }

  const flagHandler = FLAG_HANDLERS[token];
  if (flagHandler) {
    const error = flagHandler(state);
    return { advance: 1, error: error ?? undefined };
  }

  if (token.startsWith('-')) {
    return { advance: 1, error: `Unknown option: ${token}` };
  }

  if (!state.inputPath) {
    state.inputPath = token;
    return { advance: 1 };
  }

  return { advance: 1, error: `Unexpected argument: ${token}` };
};

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

async function readInputJson(inputPath: string): Promise<unknown> {
  let rawText = '';
  try {
    rawText = await readFile(inputPath, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new LintCommandError(`Unable to read input file: ${message}`, 1);
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new LintCommandError(`Invalid JSON in input file: ${message}`, 1);
  }
}

function normalizeRuleSelection(
  options: LintCommandOptions,
  config?: LintConfig,
): {
  onlyRules?: string[];
  skipRules?: string[];
} {
  const rules = getRules() as Array<{ id: string }>;
  const ruleIds = new Set<string>(rules.map((rule) => rule.id));
  const onlyRules = options.onlyRules?.length ? options.onlyRules : undefined;
  const skipRules = new Set(options.skipRules ?? []);

  applyStrictModeSkips(skipRules, onlyRules, config);
  applyConfigRuleSkips(skipRules, config);

  const skipRulesList = skipRules.size > 0 ? [...skipRules] : undefined;

  assertValidRuleIds(ruleIds, onlyRules);
  assertValidRuleIds(ruleIds, skipRulesList);

  return { onlyRules, skipRules: skipRulesList };
}

function applyStrictModeSkips(
  skipRules: Set<string>,
  onlyRules: string[] | undefined,
  config?: LintConfig,
): void {
  if (config?.strictMode !== false) return;
  if (onlyRules?.includes('RISK_HIGH_ENTROPY')) return;
  skipRules.add('RISK_HIGH_ENTROPY');
}

function applyConfigRuleSkips(skipRules: Set<string>, config?: LintConfig): void {
  if (!config?.rules) return;
  for (const [ruleId, level] of Object.entries(config.rules)) {
    if (level === 'off') {
      skipRules.add(ruleId);
    }
  }
}

function assertValidRuleIds(ruleIds: Set<string>, ids: string[] | undefined): void {
  if (!ids || ids.length === 0) return;
  const invalid = ids.filter((id) => !ruleIds.has(id));
  if (invalid.length > 0) {
    throw new LintCommandError(`Unknown rule IDs: ${invalid.join(', ')}`, 1);
  }
}

function applyRuleLevels(
  findings: RiskFinding[],
  filePath: string,
  config?: LintConfig,
): LintFinding[] {
  const levels = config?.rules ?? {};
  const resolved: LintFinding[] = [];

  for (const finding of findings) {
    const configured = levels[finding.id];
    if (configured === 'off') {
      continue;
    }

    const level = configured ?? severityToLevel(finding.severity);
    resolved.push({ ...finding, level, filePath });
  }

  return resolved;
}

function severityToLevel(severity: RiskFinding['severity']): LintRuleLevel {
  if (severity === 'high') return 'error';
  return 'warn';
}

async function collectInputFiles(
  inputPath: string,
  include?: string[],
  exclude?: string[],
): Promise<string[]> {
  const stats = await stat(inputPath);
  if (stats.isFile()) {
    return [inputPath];
  }

  if (!stats.isDirectory()) {
    throw new LintCommandError('Input path must be a file or directory', 1);
  }

  const includeGlobs = include && include.length > 0 ? include : ['**/*.json'];
  const excludeGlobs = exclude ?? [];
  const includeMatchers = includeGlobs.map(globToRegExp);
  const excludeMatchers = excludeGlobs.map(globToRegExp);

  const files: string[] = [];
  await walkDirectory(inputPath, inputPath, (relativePath, fullPath) => {
    const normalized = relativePath.replaceAll(path.sep, '/');
    if (!includeMatchers.some((regex) => regex.test(normalized))) return;
    if (excludeMatchers.some((regex) => regex.test(normalized))) return;
    files.push(fullPath);
  });

  return files.sort((a, b) => a.localeCompare(b));
}

async function walkDirectory(
  root: string,
  current: string,
  onFile: (relativePath: string, fullPath: string) => void,
): Promise<void> {
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      await walkDirectory(root, fullPath, onFile);
      continue;
    }
    if (entry.isFile()) {
      const relativePath = path.relative(root, fullPath);
      onFile(relativePath, fullPath);
    }
  }
}

function globToRegExp(glob: string): RegExp {
  const escaped = glob
    .replaceAll('\\', '/')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\*\\\*/g, '.*')
    .replace(/\\\*/g, '[^/]*')
    .replace(/\\\?/g, '[^/]');
  return new RegExp(`^${escaped}$`);
}

export async function writeLintOutput(content: string, outPath: string): Promise<void> {
  const dir = path.dirname(outPath);
  await mkdir(dir, { recursive: true });
  await writeFile(outPath, content, 'utf-8');
}
