import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseJsonSafe } from '@/utils/errorHandling';
import { buildResultFromInput } from '@/workers/buildResult';

describe('worker integration smoke test', () => {
  it('builds a result from a fixture flow without errors', () => {
    const fixturePath = resolve(__dirname, '../../../../testdata/fixtures/simple.json');
    const raw = readFileSync(fixturePath, 'utf-8');
    const parsed = parseJsonSafe(raw);
    if (!parsed.ok) {
      throw parsed.error;
    }

    const result = buildResultFromInput(parsed.value);

    expect(result.aboutMyFlows.summary.nodeCount).toBeGreaterThan(0);
    expect(result.tokenEstimate.current).toBeGreaterThan(0);
    expect(Array.isArray(result.riskFindings)).toBe(true);
    expect(result.capabilityManifest).toBeTruthy();
  });
});
