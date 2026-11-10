import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { redactSecrets } from '@flow-profile/core';
import { describe, expect, it, vi } from 'vitest';

import type { BuildOptions, WorkerRequest, WorkerResponse } from '@/types/worker';

import { parseJsonSafe } from '@/utils/errorHandling';
import { buildResultFromInput } from '@/workers/buildResult';

describe('worker integration smoke test', () => {
  it.each([
    true,
    false,
  ])('does not promote __proto__ metadata into output with redaction=%s', (redactionEnabled) => {
    // Parse the literal __proto__ key as data; malformed synthetic JSON must fail the test.
    const input = JSON.parse(
      '[{"id":"tab1","type":"tab","__proto__":{"label":"SYNTHETIC inherited tab"}},{"id":"n1","type":"http request","z":"tab1","x":0,"y":0,"__proto__":{"name":"SYNTHETIC inherited node"}}]',
    );
    const result = buildResultFromInput(input, { redactionEnabled });
    expect(JSON.stringify(result)).not.toContain('SYNTHETIC inherited');
    expect(result.contextSections?.nodeLines[0]?.label).toBe('http request');
  });

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

  it('redacts synthetic node, tab and subflow labels before constructing any result', () => {
    const secret = 'SYNTHETIC-0123456789-abcdefghijklmnopqrstuvwxyz'; // ubs:ignore — synthetic privacy regression marker, not a credential.
    const result = buildResultFromInput([
      { id: 'tab1', type: 'tab', label: secret },
      { id: 'n1', type: 'http request', name: secret, z: 'tab1', x: 100, y: 100, wires: [] },
      { id: 'sf1', type: 'subflow', name: secret, in: [], out: [] },
      { id: 'n2', type: 'debug', name: 'Safe output', z: 'tab1', x: 200, y: 100, wires: [] },
    ]);
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(result.contextSections?.nodeLines.find((node) => node.id === 'n2')?.label).toBe(
      'Safe output',
    );
  });

  it.each([
    [{}, true, 2],
    [{ strictMode: false }, false, 1],
    [{ entropyThreshold: 6 }, false, 1],
    [{ redactionEnabled: false }, false, 0],
  ] as const)('honors options %j and matches CLI redaction decisions', (options, masked, count) => {
    const secret = 'SYNTHETIC-0123456789-abcdefghijklmnopqrstuvwxyz'; // ubs:ignore — synthetic privacy regression marker, not a credential.
    const input = [
      {
        id: 'n1',
        type: 'debug',
        name: secret, // ubs:ignore — synthetic node label used to exercise redaction.
        password: 'synthetic-password', // ubs:ignore — deliberately fake password field for redaction coverage.
        x: 0,
        y: 0,
        wires: [],
      },
    ];
    const result = buildResultFromInput(input, options);
    const cliRedaction = redactSecrets(input, {
      ...options,
      enabled: 'redactionEnabled' in options ? options.redactionEnabled : true,
    });
    expect(result.redactionReport).toEqual(cliRedaction.report);
    expect(result.redactionReport.totalRedacted).toBe(count);
    expect(result.contextSections?.nodeLines[0]?.label).toBe(cliRedaction.redacted[0]?.name);
    expect(JSON.stringify(result).includes(secret)).toBe(!masked);
    expect(input[0]?.password).toBe('synthetic-password');
    expect(JSON.stringify(result)).not.toContain('synthetic-password');
  });

  it('uses the same privacy pipeline in the actual worker parse and rebuild handlers', async () => {
    const responses: WorkerResponse[] = [];
    const workerScope = {
      postMessage: (message: WorkerResponse) => responses.push(message),
      onmessage: (_event: MessageEvent<WorkerRequest>) => {},
    };
    vi.stubGlobal('self', workerScope);
    try {
      await import('@/workers/processor.worker');
      const secret = 'SYNTHETIC-0123456789-abcdefghijklmnopqrstuvwxyz'; // ubs:ignore — synthetic privacy regression marker, not a credential.
      const rawJson = JSON.stringify([
        { id: 'tab1', type: 'tab', label: secret },
        { id: 'n1', type: 'debug', name: secret, z: 'tab1', x: 0, y: 0, wires: [] },
      ]);
      for (const options of [
        { redactionEnabled: false },
        { strictMode: false },
        { entropyThreshold: 6 },
        { redactionEnabled: true, strictMode: true, entropyThreshold: 4.5 },
      ] satisfies Partial<BuildOptions>[]) {
        for (const type of ['parse', 'rebuild'] as const) {
          responses.length = 0;
          const request: WorkerRequest =
            type === 'parse'
              ? { type, payload: rawJson, options }
              : { type, payload: { rawJson, ...options } };
          workerScope.onmessage({ data: request } as MessageEvent<WorkerRequest>);
          const result = responses.find((response) => response.type === 'result');
          expect(result?.payload).toEqual(buildResultFromInput(JSON.parse(rawJson), options));
        }
      }
      responses.length = 0;
      workerScope.onmessage({
        data: { type: 'parse', payload: `invalid-${secret}` },
      } as MessageEvent<WorkerRequest>);
      expect(responses.at(-1)?.type).toBe('error');
      expect(JSON.stringify(responses)).not.toContain(secret);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
