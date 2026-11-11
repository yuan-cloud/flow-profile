import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { expandSubflows } from '../expand/subflow.js';
import { parseFlow } from '../parser/parse.js';
import { redactSecrets } from './redact.js';

const fixturePath = path.resolve(__dirname, '../../../../testdata/fixtures/secrets-entropy.json');
const fixtureContent = fs.readFileSync(fixturePath, 'utf-8'); // ubs:ignore — one-time test fixture loading is intentionally synchronous.
const fixtureData = JSON.parse(fixtureContent) as unknown; // ubs:ignore — malformed fixture JSON must fail the test suite.

const secrets = ['supersecret', 'AKIAIOSFODNN7EXAMPLE', 'ghp_FakeTokenValue0123456789abcdef'];

function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

describe('Redaction Engine', () => {
  it.each([true, false])('copies __proto__ as data with redaction enabled=%s', (enabled) => {
    // Parse the literal __proto__ key as data; malformed synthetic JSON must fail the test.
    const input = JSON.parse(
      '{"__proto__":{"name":"SYNTHETIC inherited label","password":"synthetic-password"},"nested":[{"__proto__":{"label":"SYNTHETIC nested label"}}]}',
    );
    const { redacted } = redactSecrets(input, { enabled });
    expect(Object.getPrototypeOf(redacted)).toBe(Object.prototype);
    expect(Object.hasOwn(redacted, '__proto__')).toBe(true);
    expect(redacted.name).toBeUndefined();
    expect(redacted.nested[0].label).toBeUndefined();
    expect(Object.hasOwn(redacted.nested[0], '__proto__')).toBe(true);
    expect(Object.getOwnPropertyDescriptor(redacted, '__proto__')?.value.password).toBe(
      enabled ? 'SECRET_A1' : 'synthetic-password',
    );
    expect(Object.getOwnPropertyDescriptor(input, '__proto__')?.value.password).toBe(
      'synthetic-password',
    );
  });

  it.each([
    2, 3.5, 4.5, 6,
  ])('preserves subflow topology at entropy threshold %s', (entropyThreshold) => {
    const definitionId = 'fedcba9876543210';
    const internalId = 'node-0123456789-abcdefghijklmnopqrstuvwxyz';
    const type = `subflow:${definitionId}`;
    const input = [
      { id: 'tab1', type: 'tab', label: 'Safe tab' },
      {
        id: definitionId,
        type: 'subflow',
        name: 'Safe subflow',
        in: [{ x: 0, y: 0, wires: [{ id: internalId }] }],
        out: [{ x: 100, y: 0, wires: [{ id: internalId, port: 0 }] }],
      },
      {
        id: internalId,
        type: 'function',
        z: definitionId,
        name: internalId,
        x: 50,
        y: 0,
        wires: [],
      },
      { id: 'source', type: 'inject', z: 'tab1', x: 0, y: 0, wires: [['instance']] },
      { id: 'instance', type, z: 'tab1', name: type, x: 100, y: 0, wires: [['sink']] },
      { id: 'sink', type: 'debug', z: 'tab1', x: 200, y: 0, wires: [] },
    ];
    const { redacted } = redactSecrets(input, { entropyThreshold });
    const expanded = expandSubflows(parseFlow(redacted));
    expect(expanded.expansionMetadata.expandedSubflows).toEqual(['instance']);
    expect(expanded.edges).toEqual([
      { source: `instance:${internalId}`, sourcePort: 0, target: 'sink' },
      { source: 'source', sourcePort: 0, target: `instance:${internalId}` },
    ]);
    expect(redacted[4]?.type).toBe(type);
    expect(redacted[2]?.id).toBe(internalId);
    // Identical values in content fields must still undergo normal entropy scanning.
    if (entropyThreshold <= 3.5) expect(redacted[4]?.name).toMatch(/^SECRET_/);
    else expect(redacted[4]?.name).toBe(type);
    if (entropyThreshold <= 4.5) expect(redacted[2]?.name).toMatch(/^SECRET_/);
    else expect(redacted[2]?.name).toBe(internalId);
  });

  it('limits structural exemptions to flow positions and honors explicit field patterns', () => {
    const marker = 'SYNTHETIC-0123456789-abcdefghijklmnopqrstuvwxyz'; // ubs:ignore — synthetic content marker.
    const input = [
      {
        id: marker,
        type: `subflow:${marker}`,
        z: marker,
        wires: [[marker]],
        metadata: { id: marker, type: marker, wires: [[marker]] },
        in: [{ wires: [{ id: marker }] }], // Not a subflow definition: this is content.
        password: marker, // ubs:ignore — synthetic sensitive-field value.
      },
    ];
    const { redacted } = redactSecrets(input);
    expect(redacted[0]?.id).toBe(marker);
    expect(redacted[0]?.type).toBe(`subflow:${marker}`);
    expect(redacted[0]?.z).toBe(marker);
    expect(redacted[0]?.wires).toEqual([[marker]]);
    expect(JSON.stringify(redacted[0]?.metadata)).not.toContain(marker);
    expect(JSON.stringify(redacted[0]?.in)).not.toContain(marker);
    expect(redacted[0]?.password).toMatch(/^SECRET_/);
    expect(redactSecrets({ id: marker, type: marker }).redacted).toEqual({
      id: 'SECRET_A1',
      type: 'SECRET_A1',
    });
    const explicit = redactSecrets(input, { additionalPatterns: [/^type$/] });
    expect(explicit.redacted[0]?.type).toMatch(/^SECRET_/);
  });

  it('keeps the documented low-entropy alias limitation separate from field matching', () => {
    const input = { password: 'synthetic private phrase', name: 'synthetic private phrase' }; // ubs:ignore — synthetic low-entropy aliases.
    expect(redactSecrets(input).redacted).toEqual({
      password: 'SECRET_A1', // ubs:ignore — expected redaction mask, not a credential.
      name: input.name,
    });
  });

  it('redacts known secret fields with deterministic masks', () => {
    const result = redactSecrets(fixtureData);

    const serialized = stringify(result.redacted);
    for (const secret of secrets) {
      expect(serialized.includes(secret)).toBe(false);
    }

    expect(result.report.entries.length).toBeGreaterThanOrEqual(3);
    expect(result.report.entries.every((entry) => entry.maskAssigned.startsWith('SECRET_'))).toBe(
      true,
    );

    const passwordEntry = result.report.entries.find((entry) =>
      entry.fieldPath.endsWith('.password'),
    );
    expect(passwordEntry).toBeDefined();
    expect(passwordEntry?.reason).toBe('field_name');
  });

  it('produces deterministic output across runs', () => {
    const resultA = redactSecrets(fixtureData);
    const resultB = redactSecrets(fixtureData);

    expect(stringify(resultA.redacted)).toBe(stringify(resultB.redacted));
    expect(resultA.report.entries).toEqual(resultB.report.entries);
  });

  it('skips base64-like false positives for entropy scanning', () => {
    const input = {
      note: 'VGhpcyBpcyBqdXN0IGJhc2U2NCB0ZXh0',
    };

    const result = redactSecrets(input, { strictMode: true, entropyThreshold: 3.5 });

    expect(result.report.entries.length).toBe(0);
    expect(result.redacted).toEqual(input);
  });

  it('captures entropy-based redaction when strict mode enabled', () => {
    const input = {
      label: 'test',
      data: 'Ab3dE6fG8hJ9kLm2Np4Qr5St7Uv8Wx9Yz',
    };

    const result = redactSecrets(input, { strictMode: true, entropyThreshold: 3.5 });

    expect(result.report.entries.length).toBe(1);
    expect(result.report.entries[0]?.reason).toBe('entropy');
    expect(stringify(result.redacted)).not.toContain(input.data);
  });
});
