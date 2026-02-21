import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { type Zippable, zipSync } from 'fflate';
import type { ParsedFlow } from '../parser/types.js';
import { canonicalStringify } from '../utils/canonical.js';
import { stringifyAboutMyFlows } from './about-my-flows.js';
import { stringifyCapabilityManifest } from './capability-manifest.js';
import { buildPromptContext } from './prompt-context.js';
import { stringifyRiskFindings } from './risk-findings.js';

export interface SupportBundleOptions {
  redactionEnabled?: boolean;
  strictMode?: boolean;
  entropyThreshold?: number;
  flattenSubflows?: boolean;
}

export interface SupportBundleArtifact {
  name: string;
  sha256: string;
  sizeBytes: number;
}

export interface BundleManifest {
  version: '1.0';
  createdWith: 'flow-profile';
  parameters: {
    redactionEnabled: boolean;
    strictMode: boolean;
    entropyThreshold: number;
    flattenSubflows: boolean;
  };
  artifacts: SupportBundleArtifact[];
}

export interface SupportBundleResult {
  zipBytes: Uint8Array;
  manifest: BundleManifest;
  artifacts: SupportBundleArtifact[];
}

const DEFAULT_OPTIONS: Required<SupportBundleOptions> = {
  redactionEnabled: true,
  strictMode: true,
  entropyThreshold: 4.5,
  flattenSubflows: false,
};

const ZIP_MTIME = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));

export function buildSupportBundle(
  flow: ParsedFlow,
  options: SupportBundleOptions = {},
): SupportBundleResult {
  const resolved = { ...DEFAULT_OPTIONS, ...options };

  const about = stringifyAboutMyFlows(flow);
  const capability = stringifyCapabilityManifest(flow);
  const prompt = buildPromptContext(flow);
  const riskFindings = stringifyRiskFindings(flow);

  const artifactFiles = [
    { name: 'about-my-flows.json', contents: about },
    { name: 'capability-manifest.json', contents: capability },
    { name: 'prompt-context.md', contents: prompt },
    { name: 'risk-findings.json', contents: riskFindings },
  ];

  artifactFiles.sort((a, b) => a.name.localeCompare(b.name));

  const artifacts = buildArtifacts(artifactFiles);
  const manifest = buildBundleManifest(resolved, artifacts);
  const manifestText = canonicalStringify(manifest, { indent: 2 });

  const zipFiles = [
    { name: 'about-my-flows.json', contents: about },
    { name: 'bundle-manifest.json', contents: manifestText },
    { name: 'capability-manifest.json', contents: capability },
    { name: 'prompt-context.md', contents: prompt },
    { name: 'risk-findings.json', contents: riskFindings },
  ];

  const zipBytes = buildZip(zipFiles);

  return {
    zipBytes,
    manifest,
    artifacts,
  };
}

function buildBundleManifest(
  options: Required<SupportBundleOptions>,
  artifacts: SupportBundleArtifact[],
): BundleManifest {
  return {
    version: '1.0',
    createdWith: 'flow-profile',
    parameters: {
      redactionEnabled: options.redactionEnabled,
      strictMode: options.strictMode,
      entropyThreshold: options.entropyThreshold,
      flattenSubflows: options.flattenSubflows,
    },
    artifacts: artifacts.map((artifact) => ({ ...artifact })),
  };
}

function buildArtifacts(files: Array<{ name: string; contents: string }>): SupportBundleArtifact[] {
  const encoder = new TextEncoder();
  return files.map((file) => {
    const bytes = encoder.encode(file.contents);
    return {
      name: file.name,
      sha256: bytesToHex(sha256(bytes)),
      sizeBytes: bytes.length,
    };
  });
}

function buildZip(files: Array<{ name: string; contents: string }>): Uint8Array {
  const encoder = new TextEncoder();
  const entries: Zippable = {};

  for (const file of files) {
    const bytes = encoder.encode(file.contents);
    entries[file.name] = [bytes, { level: 0, mtime: ZIP_MTIME }];
  }

  return zipSync(entries, { level: 0, mtime: ZIP_MTIME });
}
