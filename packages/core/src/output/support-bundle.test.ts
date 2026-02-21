import * as fs from 'node:fs';
import * as path from 'node:path';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { parseFlow } from '../parser/parse.js';
import type { BundleManifest } from './support-bundle.js';
import { buildSupportBundle } from './support-bundle.js';

const fixturePath = path.resolve(__dirname, '../../../../testdata/fixtures/simple.json');
const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');
const fixtureData = JSON.parse(fixtureContent) as unknown;

const EXPECTED_FILES = [
  'about-my-flows.json',
  'bundle-manifest.json',
  'capability-manifest.json',
  'prompt-context.md',
  'risk-findings.json',
];

describe('support-bundle output', () => {
  it('produces deterministic zip bytes', () => {
    const flow = parseFlow(fixtureData);
    const a = buildSupportBundle(flow).zipBytes;
    const b = buildSupportBundle(flow).zipBytes;

    expect(a).toEqual(b);
  });

  it('contains expected files and manifest hashes', () => {
    const flow = parseFlow(fixtureData);
    const { zipBytes } = buildSupportBundle(flow);
    const unzipped = unzipSync(zipBytes);

    const filenames = Object.keys(unzipped).sort();
    expect(filenames).toEqual([...EXPECTED_FILES].sort());

    const manifestBytes = unzipped['bundle-manifest.json'];
    const manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as BundleManifest;

    const artifactNames = manifest.artifacts.map((artifact) => artifact.name).sort();
    expect(artifactNames).toEqual(
      [
        'about-my-flows.json',
        'capability-manifest.json',
        'prompt-context.md',
        'risk-findings.json',
      ].sort(),
    );

    for (const artifact of manifest.artifacts) {
      const bytes = unzipped[artifact.name];
      const hash = bytesToHex(sha256(bytes));
      expect(artifact.sha256).toBe(hash);
      expect(artifact.sizeBytes).toBe(bytes.length);
    }
  });
});
