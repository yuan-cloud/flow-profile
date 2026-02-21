import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  buildPromptContext,
  buildSupportBundle,
  canonicalStringify,
  expandSubflows,
  parseFlow,
  redactSecrets,
  stringifyAboutMyFlows,
  stringifyCapabilityManifest,
  stringifyRiskFindings,
} from '@flow-profile/core';

export type BuildCommandOptions = {
  inputPath: string;
  outDir?: string;
  redactionEnabled?: boolean;
  strictMode?: boolean;
  entropyThreshold?: number;
  flattenSubflows?: boolean;
  json?: boolean;
  quiet?: boolean;
};

export type BuildCommandResult = {
  outDir: string;
  artifacts: Array<{ name: string; path: string; sizeBytes: number }>;
  bundleZipPath: string;
  manifestPath: string;
  redaction: { enabled: boolean; totalRedacted: number };
};

const DEFAULT_OUT_DIR = 'out';

const OUTPUT_FILES = {
  about: 'about-my-flows.json',
  capability: 'capability-manifest.json',
  prompt: 'prompt-context.md',
  risks: 'risk-findings.json',
  manifest: 'bundle-manifest.json',
  bundle: 'support-bundle.zip',
} as const;

export class BuildCommandError extends Error {
  readonly code: number;

  constructor(message: string, code: number) {
    super(message);
    this.name = 'BuildCommandError';
    this.code = code;
  }
}

function isZodError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if ('issues' in error) return true;
  if (error instanceof Error) {
    if (error.name === 'ZodError') return true;
    if (error.message.startsWith('Node-RED flow validation failed')) return true;
  }
  return false;
}

async function readInputJson(inputPath: string): Promise<unknown> {
  let rawText = '';
  try {
    rawText = await readFile(inputPath, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new BuildCommandError(`Unable to read input file: ${message}`, 1);
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new BuildCommandError(`Invalid JSON in input file: ${message}`, 1);
  }
}

function parseFlowOrThrow(input: unknown) {
  try {
    return parseFlow(input);
  } catch (error) {
    if (isZodError(error)) {
      throw new BuildCommandError('Flow validation failed', 2);
    }
    throw error;
  }
}

export async function runBuildCommand(options: BuildCommandOptions): Promise<BuildCommandResult> {
  const outDir = options.outDir ?? DEFAULT_OUT_DIR;
  const redactionEnabled = options.redactionEnabled ?? true;
  const strictMode = options.strictMode ?? true;
  const entropyThreshold = options.entropyThreshold ?? 4.5;
  const flattenSubflows = options.flattenSubflows ?? true;

  if (!options.inputPath) {
    throw new BuildCommandError('Missing input path', 1);
  }

  const parsedInput = await readInputJson(options.inputPath);

  const redactionResult = redactSecrets(parsedInput, {
    enabled: redactionEnabled,
    strictMode,
    entropyThreshold,
  });

  const parsedFlow = parseFlowOrThrow(redactionResult.redacted);
  const flow = flattenSubflows ? expandSubflows(parsedFlow) : parsedFlow;

  const aboutText = stringifyAboutMyFlows(flow, 2);
  const capabilityText = stringifyCapabilityManifest(flow, 2);
  const promptText = buildPromptContext(flow, { budget: 8000 });
  const risksText = stringifyRiskFindings(flow, 2);

  const supportBundle = buildSupportBundle(flow, {
    redactionEnabled,
    strictMode,
    entropyThreshold,
    flattenSubflows,
  });

  const manifestText = canonicalStringify(supportBundle.manifest, { indent: 2 });

  await mkdir(outDir, { recursive: true });

  const artifactPaths = {
    about: path.join(outDir, OUTPUT_FILES.about),
    capability: path.join(outDir, OUTPUT_FILES.capability),
    prompt: path.join(outDir, OUTPUT_FILES.prompt),
    risks: path.join(outDir, OUTPUT_FILES.risks),
    manifest: path.join(outDir, OUTPUT_FILES.manifest),
    bundle: path.join(outDir, OUTPUT_FILES.bundle),
  };

  await writeFile(artifactPaths.about, aboutText, 'utf-8');
  await writeFile(artifactPaths.capability, capabilityText, 'utf-8');
  await writeFile(artifactPaths.prompt, promptText, 'utf-8');
  await writeFile(artifactPaths.risks, risksText, 'utf-8');
  await writeFile(artifactPaths.manifest, manifestText, 'utf-8');
  await writeFile(artifactPaths.bundle, supportBundle.zipBytes);

  const artifacts = [
    { name: OUTPUT_FILES.about, path: artifactPaths.about, sizeBytes: aboutText.length },
    {
      name: OUTPUT_FILES.capability,
      path: artifactPaths.capability,
      sizeBytes: capabilityText.length,
    },
    { name: OUTPUT_FILES.prompt, path: artifactPaths.prompt, sizeBytes: promptText.length },
    { name: OUTPUT_FILES.risks, path: artifactPaths.risks, sizeBytes: risksText.length },
    { name: OUTPUT_FILES.manifest, path: artifactPaths.manifest, sizeBytes: manifestText.length },
    {
      name: OUTPUT_FILES.bundle,
      path: artifactPaths.bundle,
      sizeBytes: supportBundle.zipBytes.length,
    },
  ];

  return {
    outDir,
    artifacts,
    bundleZipPath: artifactPaths.bundle,
    manifestPath: artifactPaths.manifest,
    redaction: {
      enabled: redactionEnabled,
      totalRedacted: redactionResult.report.totalRedacted,
    },
  };
}

export type BuildArgsParseResult =
  | { ok: true; options: BuildCommandOptions }
  | { ok: false; error: string };

export function parseBuildArgs(argv: string[]): BuildArgsParseResult {
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

export function buildHelpText(): string {
  return [
    'flow-profile build --in <flow.json>',
    '',
    'Options:',
    '  --in <path>             Input flow JSON file (required)',
    '  --out-dir <dir>         Output directory (default: out)',
    '  -o, --out <dir>          Alias for --out-dir',
    '  --redact                Enable redaction (default)',
    '  --no-redact             Disable redaction (prints warning)',
    '  --strict                Enable entropy scanning (default)',
    '  --no-strict             Disable entropy-based redaction',
    '  --flatten               Expand subflows (default)',
    '  --no-flatten            Do not expand subflows',
    '  --entropy <value>       Entropy threshold override',
    '  --json                  Emit machine-readable JSON summary',
    '  --quiet                 Suppress non-error output',
    '  -h, --help              Show this help',
  ].join('\n');
}

type ParseState = {
  inputPath: string | null;
  outDir?: string;
  redactionEnabled: boolean;
  strictMode: boolean;
  entropyThreshold?: number;
  flattenSubflows: boolean;
  json: boolean;
  quiet: boolean;
};

const createParseState = (): ParseState => ({
  inputPath: null,
  outDir: undefined,
  redactionEnabled: true,
  strictMode: true,
  entropyThreshold: undefined,
  flattenSubflows: true,
  json: false,
  quiet: false,
});

const finalizeParseState = (state: ParseState): BuildCommandOptions => ({
  inputPath: state.inputPath ?? '',
  outDir: state.outDir,
  redactionEnabled: state.redactionEnabled,
  strictMode: state.strictMode,
  entropyThreshold: state.entropyThreshold,
  flattenSubflows: state.flattenSubflows,
  json: state.json,
  quiet: state.quiet,
});

const FLAG_HANDLERS: Record<string, (state: ParseState) => string | null> = {
  '-h': () => 'help',
  '--help': () => 'help',
  '--redact': (state) => {
    state.redactionEnabled = true;
    return null;
  },
  '--no-redact': (state) => {
    state.redactionEnabled = false;
    return null;
  },
  '--strict': (state) => {
    state.strictMode = true;
    return null;
  },
  '--no-strict': (state) => {
    state.strictMode = false;
    return null;
  },
  '--flatten': (state) => {
    state.flattenSubflows = true;
    return null;
  },
  '--no-flatten': (state) => {
    state.flattenSubflows = false;
    return null;
  },
  '--flatten-subflows': (state) => {
    state.flattenSubflows = true;
    return null;
  },
  '--json': (state) => {
    state.json = true;
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
  '--out-dir': (state, value) => {
    state.outDir = value;
    return null;
  },
  '--out': (state, value) => {
    state.outDir = value;
    return null;
  },
  '-o': (state, value) => {
    state.outDir = value;
    return null;
  },
  '--entropy': (state, value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 'Invalid value for --entropy';
    state.entropyThreshold = parsed;
    return null;
  },
};

type ConsumeResult = { ok: true } | { ok: false; error: string };

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

type TokenResult = { advance: number; error?: string };

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
