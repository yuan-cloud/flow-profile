import { buildCapabilityManifest, type CapabilityManifest } from '../capability/manifest.js';
import type { ParsedFlow } from '../parser/types.js';
import { canonicalStringify } from '../utils/canonical.js';

export interface CapabilityManifestOutput extends CapabilityManifest {
  version: '1.0';
}

export function buildCapabilityManifestOutput(flow: ParsedFlow): CapabilityManifestOutput {
  const manifest = buildCapabilityManifest(flow);

  return {
    version: '1.0',
    tools: manifest.tools,
    resources: manifest.resources,
    metadata: manifest.metadata,
  };
}

export function stringifyCapabilityManifest(flow: ParsedFlow, indent = 2): string {
  return canonicalStringify(buildCapabilityManifestOutput(flow), { indent });
}
