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
import { createLintPrivacy, markLintFinding, safeRuleIds } from '../output/lint-privacy.js';

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
  readonly category: string;

  constructor(message: string, code: number, category = 'analysis') {
    super(message);
    this.name = 'LintCommandError';
    this.code = code;
    this.category = category;
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
    throw new LintCommandError('No input files found', 1, 'no-files');
  }

  const files: LintFileResult[] = [];
  const allFindings: LintFinding[] = [];
  const rulesExecuted = new Set<string>();
  const inputs: unknown[] = [];
  for (const filePath of inputFiles) inputs.push(await readInputJson(filePath));
  const privacy = createLintPrivacy([], inputs, inputFiles);

  for (const [index, filePath] of inputFiles.entries()) {
    let flow: ReturnType<typeof parseFlow>;
    try {
      flow = parseFlow(inputs[index]);
    } catch {
      throw new LintCommandError('Invalid Node-RED flow schema', 1, 'schema');
    }

    const result = detectRisks(flow, {
      onlyRules: rules.onlyRules,
      skipRules: rules.skipRules,
      entropyThreshold: resolvedConfig?.entropyThreshold,
      presentation: privacy.presentation,
    });

    for (const ruleId of result.rulesExecuted) {
      rulesExecuted.add(ruleId);
    }

    const findings = applyRuleLevels(result.findings, privacy.path(filePath), resolvedConfig).map(
      (finding) => markLintFinding(finding),
    );
    const errorCount = findings.filter((finding) => finding.level === 'error').length;
    const warningCount = findings.filter((finding) => finding.level === 'warn').length;

    files.push({
      filePath: privacy.path(filePath),
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

function sanitizeLintResult(result: LintCommandResult, inputs: unknown[] = []): LintCommandResult {
  const privacy = createLintPrivacy(
    [...result.findings, ...result.files.flatMap((file) => file.findings)],
    inputs,
    result.files.map((file) => file.filePath),
  );
  const finding = (value: LintFinding): LintFinding => {
    const safe = privacy.finding(value);
    return {
      ...safe,
      // canonicalStringify treats repeated object references as cycles.
      affectedNodes: safe.affectedNodes.map((node) => ({ ...node })),
      level: ['error', 'warn', 'off'].includes(value.level) ? value.level : 'warn',
      filePath: privacy.path(value.filePath),
    };
  };
  return {
    findingCount: result.findingCount,
    errorCount: result.errorCount,
    warningCount: result.warningCount,
    rulesExecuted: safeRuleIds(result.rulesExecuted),
    findings: result.findings.map(finding),
    files: result.files.map((file) => ({
      filePath: privacy.path(file.filePath),
      findingCount: file.findingCount,
      errorCount: file.errorCount,
      warningCount: file.warningCount,
      findings: file.findings.map(finding),
    })),
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
  } catch {
    throw new LintCommandError('Unable to read input file', 1, 'read');
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    throw new LintCommandError('Invalid JSON in input file', 1, 'json');
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
    throw new LintCommandError('Unknown rule IDs', 1, 'rules');
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
  let stats: Awaited<ReturnType<typeof stat>>;
  try {
    stats = await stat(inputPath);
  } catch {
    throw new LintCommandError('Unable to read input path', 1, 'read');
  }
  if (stats.isFile()) {
    return [inputPath];
  }

  if (!stats.isDirectory()) {
    throw new LintCommandError('Input path must be a file or directory', 1);
  }

  const includeGlobs = include && include.length > 0 ? include : ['**/*.json'];
  const excludeGlobs = exclude ?? [];
  let includeMatchers: RegExp[];
  let excludeMatchers: RegExp[];
  try {
    includeMatchers = includeGlobs.map(globToRegExp);
    excludeMatchers = excludeGlobs.map(globToRegExp);
  } catch {
    throw new LintCommandError('Unable to compile lint include/exclude patterns', 1, 'glob');
  }

  const files: string[] = [];
  try {
    await walkDirectory(inputPath, inputPath, (relativePath, fullPath) => {
      const normalized = relativePath.replaceAll(path.sep, '/');
      if (!includeMatchers.some((regex) => regex.test(normalized))) return;
      if (excludeMatchers.some((regex) => regex.test(normalized))) return;
      files.push(fullPath);
    });
  } catch {
    throw new LintCommandError('Unable to read input directory', 1, 'read');
  }

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
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(outPath, content, 'utf-8');
  } catch {
    throw new LintCommandError('Unable to write lint report', 1, 'write');
  }
}
