import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { redactSecrets } from './redact.js';

const fixturePath = path.resolve(__dirname, '../../../../testdata/fixtures/secrets-entropy.json');
const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');
const fixtureData = JSON.parse(fixtureContent) as unknown;

const secrets = ['supersecret', 'AKIAIOSFODNN7EXAMPLE', 'ghp_FakeTokenValue0123456789abcdef'];

function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

describe('Redaction Engine', () => {
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
