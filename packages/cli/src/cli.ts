#!/usr/bin/env node

import {
  BuildCommandError,
  buildHelpText,
  parseBuildArgs,
  runBuildCommand,
} from './commands/build.js';
import {
  DocCommandError,
  docHelpText,
  parseDocArgs,
  runDocCommand,
  writeDocOutput,
} from './commands/doc.js';
import {
  computeLintExitCode,
  formatLintResult,
  LintCommandError,
  lintHelpText,
  parseLintArgs,
  resolveLintFailOn,
  runLintCommand,
  writeLintOutput,
} from './commands/lint.js';
import { loadLintConfig } from './config/load.js';
import { formatSarifLog } from './output/sarif.js';

const GLOBAL_HELP = [
  'flow-profile <command>',
  '',
  'Commands:',
  '  build     Build deterministic support bundle from a Node-RED flow export',
  '  doc       Generate runbook documentation or flow diffs',
  '  lint      Run static risk detection on a Node-RED flow export',
  '',
  'Use "flow-profile <command> --help" for command-specific options.',
].join('\n');

type IoStreams = {
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
};

const DEFAULT_IO: IoStreams = {
  stdout: process.stdout,
  stderr: process.stderr,
};

export async function runCli(
  argv = process.argv.slice(2),
  io: IoStreams = DEFAULT_IO,
): Promise<number> {
  const [command, ...rest] = argv;

  if (!command || command === '-h' || command === '--help') {
    return printHelp(io);
  }

  if (command === 'build') {
    return handleBuild(rest, io);
  }

  if (command === 'doc') {
    return handleDoc(rest, io);
  }

  if (command === 'lint') {
    return handleLint(rest, io);
  }

  io.stderr.write(`Unknown command: ${command}\n`);
  io.stderr.write('Run "flow-profile --help" for available commands.\n');
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().then((code) => {
    process.exitCode = code;
  });
}

async function handleLint(args: string[], io: IoStreams): Promise<number> {
  const parsed = parseLintArgs(args);
  if (!parsed.ok) {
    return handleLintParseFailure(parsed.error, io);
  }

  try {
    const config = await loadLintConfig(parsed.options.configPath);
    const result = await runLintCommand(parsed.options, config);
    const format = parsed.options.format ?? 'text';
    const failOn = resolveLintFailOn(parsed.options, config);
    await writeLintReport(format, result, parsed.options, io);
    return computeLintExitCode(result, failOn);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = error instanceof LintCommandError ? error.code : 1;
    io.stderr.write(`Lint failed: ${message}\n`);
    return code;
  }
}

function handleLintParseFailure(error: string, io: IoStreams): number {
  if (error === 'help') {
    io.stdout.write(`${lintHelpText()}\n`);
    return 0;
  }
  io.stderr.write(`Error: ${error}\n`);
  io.stderr.write('Run "flow-profile lint --help" for usage.\n');
  return 1;
}

async function writeLintReport(
  format: string,
  result: Awaited<ReturnType<typeof runLintCommand>>,
  options: Parameters<typeof runLintCommand>[0],
  io: IoStreams,
): Promise<void> {
  const outputPath = options.outputPath;
  if (format === 'json') {
    const content = formatLintResult(result);
    await writeLintContent(content, outputPath, io, options.quiet, 'Lint report');
    return;
  }

  if (format === 'sarif') {
    const content = formatSarifLog(result, { inputPath: options.inputPath });
    await writeLintContent(content, outputPath, io, options.quiet, 'SARIF report');
    return;
  }

  const content = buildTextLintReport(result);
  if (outputPath) {
    await writeLintContent(content, outputPath, io, options.quiet, 'Lint report');
  } else if (!options.quiet) {
    io.stdout.write(content);
  }
}

async function writeLintContent(
  content: string,
  outputPath: string | undefined,
  io: IoStreams,
  quiet: boolean | undefined,
  label: string,
): Promise<void> {
  if (outputPath) {
    await writeLintOutput(content, outputPath);
    if (!quiet) {
      io.stdout.write(`${label} written to ${outputPath}\n`);
    }
    return;
  }
  io.stdout.write(`${content}\n`);
}

async function handleDoc(args: string[], io: IoStreams): Promise<number> {
  const parsed = parseDocArgs(args);
  if (!parsed.ok) {
    if (parsed.error === 'help') {
      io.stdout.write(`${docHelpText()}\n`);
      return 0;
    }
    io.stderr.write(`Error: ${parsed.error}\n`);
    io.stderr.write('Run "flow-profile doc --help" for usage.\n');
    return 1;
  }

  try {
    const content = await runDocCommand(parsed.options);
    await writeDocOutput(content, parsed.options.outPath);
    if (!parsed.options.quiet) {
      io.stdout.write(`Doc written to ${parsed.options.outPath}\n`);
    }
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = error instanceof DocCommandError ? error.code : 1;
    io.stderr.write(`Doc failed: ${message}\n`);
    return code;
  }
}

function buildTextLintReport(result: Awaited<ReturnType<typeof runLintCommand>>): string {
  const lines: string[] = [];
  lines.push(`Lint complete. Findings: ${result.findingCount}`);
  lines.push(`Errors: ${result.errorCount} Warnings: ${result.warningCount}`);

  for (const file of result.files) {
    if (file.findingCount === 0) {
      continue;
    }
    lines.push('');
    lines.push(file.filePath);
    for (const finding of file.findings) {
      lines.push(`  - [${finding.level}] ${finding.title}`);
      lines.push(`    ${finding.description}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function printHelp(io: IoStreams): number {
  io.stdout.write(`${GLOBAL_HELP}\n`);
  return 0;
}

async function handleBuild(args: string[], io: IoStreams): Promise<number> {
  const parsed = parseBuildArgs(args);
  if (!parsed.ok) {
    if (parsed.error === 'help') {
      io.stdout.write(`${buildHelpText()}\n`);
      return 0;
    }
    io.stderr.write(`Error: ${parsed.error}\n`);
    io.stderr.write('Run "flow-profile build --help" for usage.\n');
    return 1;
  }

  if (parsed.options.redactionEnabled === false) {
    io.stderr.write('⚠️ WARNING: Redaction disabled. Output may contain secrets.\n');
    io.stderr.write('   Do not share these files or send to AI assistants.\n');
  }

  try {
    const result = await runBuildCommand(parsed.options);
    if (parsed.options.json) {
      io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    }

    if (!parsed.options.quiet) {
      io.stdout.write(`Build complete. Output directory: ${result.outDir}\n`);
      for (const artifact of result.artifacts) {
        io.stdout.write(`- ${artifact.name} (${artifact.sizeBytes} bytes)\n`);
      }
      io.stdout.write(`Redactions: ${result.redaction.totalRedacted}\n`);
    }
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = error instanceof BuildCommandError ? error.code : 1;
    io.stderr.write(`Build failed: ${message}\n`);
    return code;
  }
}
