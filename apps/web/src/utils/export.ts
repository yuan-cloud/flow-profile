import { canonicalStringify } from '@flow-profile/core';
import { type Zippable, zipSync } from 'fflate';

export type ExportArtifacts = {
  aboutMyFlows: unknown;
  promptContext: string;
  riskFindings: unknown;
  capabilityManifest: unknown;
};

export type ExportParameters = {
  redactionEnabled: boolean;
  strictMode: boolean;
  entropyThreshold: number;
  flattenSubflows: boolean;
};

export type BundleManifest = {
  version: '1.0';
  createdWith: 'flow-profile';
  parameters: ExportParameters;
  artifacts: Array<{
    name: string;
    sha256: string;
    sizeBytes: number;
  }>;
};

const ZIP_MTIME = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));
const JSON_INDENT = 2;

const stringifyJson = (value: unknown): string =>
  canonicalStringify(value, { indent: JSON_INDENT });

const toBytes = (value: string): Uint8Array => new TextEncoder().encode(value);

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const sha256Hex = async (bytes: Uint8Array): Promise<string> => {
  if (!crypto?.subtle) {
    throw new Error('Web Crypto unavailable for hashing');
  }
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return bytesToHex(new Uint8Array(digest));
};

const buildArtifacts = (artifacts: ExportArtifacts) => {
  return [
    { name: 'about-my-flows.json', contents: stringifyJson(artifacts.aboutMyFlows) },
    { name: 'capability-manifest.json', contents: stringifyJson(artifacts.capabilityManifest) },
    { name: 'prompt-context.md', contents: artifacts.promptContext },
    { name: 'risk-findings.json', contents: stringifyJson(artifacts.riskFindings) },
  ].sort((a, b) => a.name.localeCompare(b.name));
};

export const buildBundleManifest = async (
  artifacts: Array<{ name: string; contents: string }>,
  parameters: ExportParameters,
): Promise<BundleManifest> => {
  const manifestArtifacts = await Promise.all(
    artifacts.map(async (artifact) => {
      const bytes = toBytes(artifact.contents);
      return {
        name: artifact.name,
        sha256: await sha256Hex(bytes),
        sizeBytes: bytes.length,
      };
    }),
  );

  return {
    version: '1.0',
    createdWith: 'flow-profile',
    parameters,
    artifacts: manifestArtifacts,
  };
};

export const buildSupportBundleZip = async (
  artifacts: ExportArtifacts,
  parameters: ExportParameters,
): Promise<Uint8Array> => {
  const files = buildArtifacts(artifacts);
  const manifest = await buildBundleManifest(files, parameters);
  const manifestText = stringifyJson(manifest);

  const zipEntries: Zippable = {};
  const entries = [...files, { name: 'bundle-manifest.json', contents: manifestText }].sort(
    (a, b) => a.name.localeCompare(b.name),
  );

  for (const entry of entries) {
    zipEntries[entry.name] = [toBytes(entry.contents), { level: 0, mtime: ZIP_MTIME }];
  }

  return zipSync(zipEntries, { level: 0, mtime: ZIP_MTIME });
};

export const downloadBytes = (bytes: Uint8Array, filename: string, mime: string): void => {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const downloadText = (value: string, filename: string, mime: string): void => {
  const bytes = toBytes(value);
  downloadBytes(bytes, filename, mime);
};

export const copyText = async (value: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
};

export const exportArtifacts = (artifacts: ExportArtifacts) => buildArtifacts(artifacts);
