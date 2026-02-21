import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { runCli } from '../cli.js';

type CapturedIo = {
  io: { stdout: PassThrough; stderr: PassThrough };
  read: () => { stdout: string; stderr: string };
};

const createCapturedIo = (): CapturedIo => {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  let stdoutText = '';
  let stderrText = '';

  stdout.on('data', (chunk) => {
    stdoutText += chunk.toString();
  });
  stderr.on('data', (chunk) => {
    stderrText += chunk.toString();
  });

  return {
    io: { stdout, stderr },
    read: () => ({ stdout: stdoutText, stderr: stderrText }),
  };
};

const fixturesDir = path.resolve(__dirname, '../../../../testdata/fixtures');

const createTempDir = (label: string) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return path.join(tmpdir(), `flow-profile-cli-${label}-${suffix}`);
};

const OUTPUT_FILES = [
  'about-my-flows.json',
  'capability-manifest.json',
  'prompt-context.md',
  'risk-findings.json',
  'bundle-manifest.json',
  'support-bundle.zip',
];

const FIXTURES = [
  'simple.json',
  'with-subflows.json',
  'secrets-entropy.json',
  'risk-triggers.json',
  'large-500-nodes.json',
  'capability-surface.json',
] as const;

describe('CLI integration (build)', () => {
  it.each(FIXTURES)('produces expected outputs for %s', async (fixtureName) => {
    const outDir = createTempDir(fixtureName.replace('.json', ''));
    const fixturePath = path.join(fixturesDir, fixtureName);

    try {
      const io = createCapturedIo();
      const exitCode = await runCli(['build', '--in', fixturePath, '--out-dir', outDir], io.io);

      expect(exitCode).toBe(0);

      for (const fileName of OUTPUT_FILES) {
        const filePath = path.join(outDir, fileName);
        const fileStat = await stat(filePath);
        expect(fileStat.size).toBeGreaterThan(0);
      }

      const about = JSON.parse(
        await readFile(path.join(outDir, 'about-my-flows.json'), 'utf-8'),
      ) as unknown;
      expect(about).toBeTruthy();

      const capability = JSON.parse(
        await readFile(path.join(outDir, 'capability-manifest.json'), 'utf-8'),
      ) as unknown;
      expect(capability).toBeTruthy();

      const risks = JSON.parse(
        await readFile(path.join(outDir, 'risk-findings.json'), 'utf-8'),
      ) as unknown;
      expect(risks).toBeTruthy();

      const manifest = JSON.parse(
        await readFile(path.join(outDir, 'bundle-manifest.json'), 'utf-8'),
      ) as unknown;
      expect(manifest).toBeTruthy();

      const prompt = await readFile(path.join(outDir, 'prompt-context.md'), 'utf-8');
      expect(prompt.length).toBeGreaterThan(0);

      const zipBytes = await readFile(path.join(outDir, 'support-bundle.zip'));
      expect(zipBytes.length).toBeGreaterThan(0);
      expect(zipBytes[0]).toBe(0x50);
      expect(zipBytes[1]).toBe(0x4b);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it('fails for missing input file', async () => {
    const outDir = createTempDir('missing');

    try {
      const io = createCapturedIo();
      const exitCode = await runCli(
        ['build', '--in', path.join(outDir, 'nope.json'), '--out-dir', outDir],
        io.io,
      );

      const { stderr } = io.read();
      expect(exitCode).toBe(1);
      expect(stderr).toContain('Unable to read input file');
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it('fails for invalid JSON input', async () => {
    const outDir = createTempDir('invalid-json');
    const inputPath = path.join(outDir, 'invalid.json');

    try {
      await mkdir(outDir, { recursive: true });
      await writeFile(inputPath, 'not json', 'utf-8');

      const io = createCapturedIo();
      const exitCode = await runCli(['build', '--in', inputPath, '--out-dir', outDir], io.io);

      const { stderr } = io.read();
      expect(exitCode).toBe(1);
      expect(stderr).toContain('Invalid JSON');
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it('returns validation error exit code for non-flow JSON', async () => {
    const outDir = createTempDir('invalid-flow');
    const inputPath = path.join(outDir, 'invalid-flow.json');

    try {
      await mkdir(outDir, { recursive: true });
      await writeFile(inputPath, JSON.stringify({ hello: 'world' }), 'utf-8');

      const io = createCapturedIo();
      const exitCode = await runCli(['build', '--in', inputPath, '--out-dir', outDir], io.io);

      const { stderr } = io.read();
      expect(exitCode).toBe(2);
      expect(stderr).toContain('Flow validation failed');
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it('warns when --no-redact is used', async () => {
    const outDir = createTempDir('no-redact');
    const fixturePath = path.join(fixturesDir, 'simple.json');

    try {
      const io = createCapturedIo();
      const exitCode = await runCli(
        ['build', '--in', fixturePath, '--out-dir', outDir, '--no-redact'],
        io.io,
      );

      const { stderr } = io.read();
      expect(exitCode).toBe(0);
      expect(stderr).toContain('WARNING');
      expect(stderr.toLowerCase()).toContain('redaction');
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it('prints help', async () => {
    const io = createCapturedIo();
    const exitCode = await runCli(['--help'], io.io);

    const { stdout } = io.read();
    expect(exitCode).toBe(0);
    expect(stdout).toContain('flow-profile <command>');
  });
});
