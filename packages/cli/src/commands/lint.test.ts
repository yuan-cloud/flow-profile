import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { LintCommandError, resolveLintFailOn, runLintCommand } from './lint.js';

const fixturePath = path.resolve(__dirname, '../../../../testdata/risk-triggers.json');

describe('lint command', () => {
  it('returns findings from the fixture', async () => {
    const result = await runLintCommand({ inputPath: fixturePath });

    expect(result.findingCount).toBeGreaterThan(0);
    expect(result.rulesExecuted.length).toBeGreaterThan(0);
  });

  it('honors onlyRules selection', async () => {
    const result = await runLintCommand({
      inputPath: fixturePath,
      onlyRules: ['RISK_NO_CATCH'],
    });

    expect(result.rulesExecuted).toEqual(['RISK_NO_CATCH']);
    expect(result.findings.every((finding) => finding.id === 'RISK_NO_CATCH')).toBe(true);
  });

  it('honors skipRules selection', async () => {
    const result = await runLintCommand({
      inputPath: fixturePath,
      skipRules: ['RISK_INFINITE_LOOP'],
    });

    expect(result.rulesExecuted).not.toContain('RISK_INFINITE_LOOP');
    expect(result.findings.every((finding) => finding.id !== 'RISK_INFINITE_LOOP')).toBe(true);
  });

  it('rejects unknown rule IDs', async () => {
    await expect(
      runLintCommand({
        inputPath: fixturePath,
        onlyRules: ['RISK_NOT_REAL'],
      }),
    ).rejects.toBeInstanceOf(LintCommandError);
  });

  it('uses config failOn when cli flag is unset', () => {
    const failOn = resolveLintFailOn({ inputPath: fixturePath }, { failOn: 'warn' });
    expect(failOn).toBe('warn');
  });

  it('prefers cli failOn over config', () => {
    const failOn = resolveLintFailOn({ inputPath: fixturePath, failOn: 'off' }, { failOn: 'warn' });
    expect(failOn).toBe('off');
  });
});
