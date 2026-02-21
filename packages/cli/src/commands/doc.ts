import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  compareFlows,
  generateFlowDiffMarkdown,
  generateRunbookMarkdown,
  parseFlow,
  redactSecrets,
  VERSION,
} from '@flow-profile/core';

export type DocCommandOptions = {
  inputPath: string;
  outPath: string;
  format?: 'markdown' | 'html';
  diffPath?: string;
  includeCode?: boolean;
  title?: string;
  author?: string;
  quiet?: boolean;
};

export class DocCommandError extends Error {
  readonly code: number;

  constructor(message: string, code: number) {
    super(message);
    this.name = 'DocCommandError';
    this.code = code;
  }
}

export type DocArgsParseResult =
  | { ok: true; options: DocCommandOptions }
  | { ok: false; error: string };

export async function runDocCommand(options: DocCommandOptions): Promise<string> {
  if (!options.inputPath) {
    throw new DocCommandError('Missing input path', 1);
  }

  if (!options.outPath) {
    throw new DocCommandError('Missing output path', 1);
  }

  const parsedInput = await readInputJson(options.inputPath);
  const redactionOptions = {
    enabled: true,
    strictMode: true,
    entropyThreshold: 4.5,
  };
  const redactionResult = redactSecrets(parsedInput, redactionOptions);
  const flow = parseFlow(redactionResult.redacted);

  if (options.diffPath) {
    const parsedDiffInput = await readInputJson(options.diffPath);
    const diffRedactionResult = redactSecrets(parsedDiffInput, redactionOptions);
    const diffFlow = parseFlow(diffRedactionResult.redacted);
    const diff = compareFlows(flow, diffFlow);
    const markdown = generateFlowDiffMarkdown(diff, {
      beforeLabel: options.diffPath,
      afterLabel: options.inputPath,
    });

    if ((options.format ?? 'markdown') === 'html') {
      return renderHtml(markdown, options.title ?? 'Flow Changes');
    }

    return markdown;
  }

  const markdown = generateRunbookMarkdown(flow, {
    title: options.title,
    author: options.author,
    includeCode: options.includeCode,
    version: VERSION,
  });

  if ((options.format ?? 'markdown') === 'html') {
    return renderHtml(markdown, options.title ?? 'Flow Documentation');
  }

  return markdown;
}

export function parseDocArgs(argv: string[]): DocArgsParseResult {
  const state = createParseState();
  const args = [...argv];
  const consumeResult = consumeArgs(args, state);
  if (!consumeResult.ok) {
    return consumeResult;
  }

  if (!state.inputPath) {
    return { ok: false, error: 'Missing input path' };
  }

  if (!state.outPath) {
    return { ok: false, error: 'Missing output path' };
  }

  return { ok: true, options: finalizeParseState(state) };
}

export function docHelpText(): string {
  return [
    'flow-profile doc --in <flow.json> --out <file>',
    '',
    'Options:',
    '  --in <path>             Input flow JSON file (required)',
    '  --diff <path>           Diff against another flow JSON file',
    '  --out <path>            Output file (required)',
    '  --format <type>         Output format: markdown (default), html',
    '  --include-code          Include function node source code',
    '  --title <string>        Document title (default: "Flow Documentation")',
    '  --author <string>       Author name for header',
    '  --quiet                 Suppress non-error output',
    '  -h, --help              Show this help',
  ].join('\n');
}

type ParseState = {
  inputPath: string | null;
  outPath: string | null;
  format: 'markdown' | 'html';
  includeCode: boolean;
  diffPath?: string;
  title?: string;
  author?: string;
  quiet: boolean;
};

const createParseState = (): ParseState => ({
  inputPath: null,
  outPath: null,
  format: 'markdown',
  includeCode: false,
  title: undefined,
  author: undefined,
  quiet: false,
});

const finalizeParseState = (state: ParseState): DocCommandOptions => ({
  inputPath: state.inputPath ?? '',
  outPath: state.outPath ?? '',
  format: state.format,
  includeCode: state.includeCode,
  diffPath: state.diffPath,
  title: state.title,
  author: state.author,
  quiet: state.quiet,
});

const FLAG_HANDLERS: Record<string, (state: ParseState) => string | null> = {
  '-h': () => 'help',
  '--help': () => 'help',
  '--include-code': (state) => {
    state.includeCode = true;
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
  '--out': (state, value) => {
    if (state.outPath) return 'Output path already provided';
    state.outPath = value;
    return null;
  },
  '--diff': (state, value) => {
    if (state.diffPath) return 'Diff path already provided';
    state.diffPath = value;
    return null;
  },
  '--format': (state, value) => {
    if (value !== 'markdown' && value !== 'html') {
      return `Invalid format: ${value}`;
    }
    state.format = value;
    return null;
  },
  '--title': (state, value) => {
    state.title = value;
    return null;
  },
  '--author': (state, value) => {
    state.author = value;
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

  if (!state.outPath) {
    state.outPath = token;
    return { advance: 1 };
  }

  return { advance: 1, error: `Unexpected argument: ${token}` };
};

async function readInputJson(inputPath: string): Promise<unknown> {
  let rawText = '';
  try {
    rawText = await readFile(inputPath, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new DocCommandError(`Unable to read input file: ${message}`, 1);
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new DocCommandError(`Invalid JSON in input file: ${message}`, 1);
  }
}

function renderHtml(markdown: string, title: string): string {
  const escaped = escapeHtml(markdown);
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    `  <title>${escapeHtml(title)}</title>`,
    '  <style>body{font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;margin:24px;}pre{white-space:pre-wrap;}</style>',
    '</head>',
    '<body>',
    '  <pre>',
    escaped,
    '  </pre>',
    '</body>',
    '</html>',
  ].join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function writeDocOutput(content: string, outPath: string): Promise<void> {
  const dir = path.dirname(outPath);
  await mkdir(dir, { recursive: true });
  await writeFile(outPath, content, 'utf-8');
}
