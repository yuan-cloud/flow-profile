import { readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { runBuildCommand } from './build.js';

const fixturePath = path.resolve(__dirname, '../../../../testdata/fixtures/simple.json');

const createTempDir = () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return path.join(tmpdir(), `flow-profile-build-${suffix}`);
};

describe('CLI build command', () => {
  it('writes deterministic bundle artifacts', async () => {
    const outDir = createTempDir();

    const result = await runBuildCommand({
      inputPath: fixturePath,
      outDir,
    });

    const manifestRaw = await readFile(result.manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestRaw) as { artifacts: Array<{ name: string }> };

    const names = manifest.artifacts.map((artifact) => artifact.name).sort();
    expect(names).toEqual(
      [
        'about-my-flows.json',
        'capability-manifest.json',
        'prompt-context.md',
        'risk-findings.json',
      ].sort(),
    );

    const zipBytes = await readFile(result.bundleZipPath);
    const zip = unzipSync(zipBytes);

    const zipNames = Object.keys(zip).sort();
    expect(zipNames).toEqual(
      [
        'about-my-flows.json',
        'bundle-manifest.json',
        'capability-manifest.json',
        'prompt-context.md',
        'risk-findings.json',
      ].sort(),
    );

    for (const artifact of result.artifacts) {
      const fileStat = await stat(artifact.path);
      expect(fileStat.size).toBeGreaterThan(0);
    }
  });
});
