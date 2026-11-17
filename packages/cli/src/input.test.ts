import { link, mkdtemp, open, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';
import { InputLimitError } from '@flow-profile/core';
import { describe, expect, it } from 'vitest';
import { runCli } from './cli.js';
import { runBuildCommand } from './commands/build.js';
import { runDocCommand } from './commands/doc.js';
import { runLintCommand } from './commands/lint.js';
import { loadLintConfig } from './config/load.js';
import { createInputBudget, readInputJsonFile } from './input.js';

describe('CLI input resource contract', () => {
  it('shares the structural budget across lint inputs and doc diffs', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'fp-input-work-'));
    const first = path.join(dir, 'first.json');
    const second = path.join(dir, 'second.json');
    const payload = Array(50_000).fill(Array(20).fill(null));
    await writeFile(first, JSON.stringify([{ id: 'n', type: 'debug', payload }]));
    await link(first, second);
    await expect(
      runLintCommand({ inputPath: dir, include: ['first.json', 'second.json'] }),
    ).rejects.toThrow('structure');
    await expect(
      runDocCommand({ inputPath: first, diffPath: second, outPath: path.join(dir, 'out.md') }),
    ).rejects.toThrow('structure');
  }, 30_000);

  it.each([
    'text',
    'json',
    'sarif',
  ])('reports a useful safe %s resource refusal through the CLI', async (format) => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'fp-limit-diagnostic-'));
    const inputPath = path.join(dir, 'synthetic-private-name.json');
    await writeFile(inputPath, '['.repeat(65));
    let stdout = '';
    let stderr = '';
    const capture = (append: (value: string) => void) =>
      new Writable({
        write(chunk, _encoding, next) {
          append(chunk.toString());
          next();
        },
      });
    const code = await runCli(['lint', '--in', inputPath, '--format', format, '--fail-on', 'off'], {
      stdout: capture((chunk) => {
        stdout += chunk;
      }),
      stderr: capture((chunk) => {
        stderr += chunk;
      }),
    });
    expect(code).toBe(1);
    expect(stdout).toBe('');
    expect(stderr).toContain('Input resource limit exceeded.');
    expect(stderr).not.toContain('Internal');
    expect(stderr).not.toContain(inputPath);
  });

  it.each([
    'lint',
    'build',
    'doc',
    'config',
  ] as const)('bounds %s input bytes before JSON parsing', async (kind) => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'fp-input-limit-'));
    const inputPath = path.join(dir, 'synthetic.json');
    const file = await open(inputPath, 'wx');
    try {
      // Sparse: this tests the real default limit without writing 32 MiB to disk.
      await file.truncate(32 * 1024 * 1024 + 1);
    } finally {
      await file.close();
    }
    const operation =
      kind === 'lint'
        ? runLintCommand({ inputPath })
        : kind === 'build'
          ? runBuildCommand({ inputPath, outDir: path.join(dir, 'out') })
          : kind === 'doc'
            ? runDocCommand({ inputPath, outPath: path.join(dir, 'out.md') })
            : loadLintConfig(inputPath);
    await expect(operation).rejects.toThrow('resource limits');
  });

  it('shares the total flow-byte cap in lint batches and doc diffs', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'fp-input-aggregate-'));
    const first = path.join(dir, 'first.json');
    const second = path.join(dir, 'second.json');
    // Both inputs are valid empty flows; hard linking uses only 18 MiB on disk.
    await writeFile(first, `[]${' '.repeat(18 * 1024 * 1024)}`);
    await link(first, second);
    await expect(
      runLintCommand({ inputPath: dir, include: ['first.json', 'second.json'] }),
    ).rejects.toMatchObject({
      category: 'input-limit',
      code: 1,
    });
    await expect(
      runDocCommand({ inputPath: first, diffPath: second, outPath: path.join(dir, 'out.md') }),
    ).rejects.toThrow('resource limits');
  }, 20_000);

  it('applies the 128-file bound to lint before analyzing empty flows', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'fp-lint-file-cap-'));
    const source = path.join(dir, 'source.json');
    await writeFile(source, '[]');
    const include: string[] = [];
    for (let i = 0; i < 129; i++) {
      const filename = `flow-${i}.json`;
      include.push(filename);
      await link(source, path.join(dir, filename));
    }
    const accepted = await runLintCommand({ inputPath: dir, include: include.slice(0, 128) });
    expect(accepted.files).toHaveLength(128);
    await expect(runLintCommand({ inputPath: dir, include })).rejects.toMatchObject({
      category: 'input-limit',
      code: 1,
    });
  });

  it.each([
    ['depth', '['.repeat(65)],
    ['structure', `[${','.repeat(2_000_000)}]`],
  ])('enforces the lexical %s budget before JSON parsing', async (_kind, text) => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'fp-input-preparse-'));
    const inputPath = path.join(dir, 'synthetic.json');
    await writeFile(inputPath, text);
    // Deliberately malformed: the resource diagnostic must win over a JSON syntax diagnostic.
    await expect(runLintCommand({ inputPath })).rejects.toMatchObject({
      code: 1,
      category: 'input-limit',
    });
  });
});

describe('bounded reader on real files', () => {
  it('counts actual UTF-8 bytes at an inclusive limit and rejects one byte less', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'fp-read-bytes-'));
    const file = path.join(dir, 'input.json');
    const value = { label: 'é 🙂' };
    const text = JSON.stringify(value);
    await writeFile(file, text);
    const bytes = Buffer.byteLength(text, 'utf8');
    const budget = createInputBudget(bytes);
    await expect(readInputJsonFile(file, budget)).resolves.toEqual(value);
    expect(budget.bytesRemaining).toBe(0);
    await expect(readInputJsonFile(file, createInputBudget(bytes - 1))).rejects.toThrow('bytes');
  });

  it('shares an aggregate byte budget across files', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'fp-read-batch-'));
    const first = path.join(dir, 'first.json');
    const second = path.join(dir, 'second.json');
    await writeFile(first, '[1]');
    await writeFile(second, '[2]');
    const budget = createInputBudget(5);
    await expect(readInputJsonFile(first, budget)).resolves.toEqual([1]);
    await expect(readInputJsonFile(second, budget)).rejects.toThrow('bytes');
  });

  it('refuses more than 128 reads without opening the excess path', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'fp-read-files-'));
    const file = path.join(dir, 'input.json');
    await writeFile(file, 'null');
    const budget = createInputBudget();
    for (let i = 0; i < 128; i++) {
      await expect(readInputJsonFile(file, budget)).resolves.toBeNull();
    }
    const excessRead = readInputJsonFile(path.join(dir, 'missing.json'), budget);
    await expect(excessRead).rejects.toBeInstanceOf(InputLimitError);
    await expect(excessRead).rejects.toMatchObject({ kind: 'files' });
  });

  it('rejects non-regular files and invalid budgets', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'fp-read-type-'));
    await expect(readInputJsonFile(dir)).rejects.toThrow('regular file');
    expect(() => createInputBudget(Number.NaN)).toThrow(RangeError);
    expect(() => createInputBudget(32 * 1024 * 1024 + 1)).toThrow(RangeError);
  });
});
