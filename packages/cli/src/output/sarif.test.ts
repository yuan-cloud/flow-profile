import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { runLintCommand } from '../commands/lint.js';
import { formatSarifLog } from './sarif.js';

const fixturePath = path.resolve(__dirname, '../../../../testdata/risk-triggers.json');

describe('SARIF output', () => {
  it('includes rules, results, and remediation guidance', async () => {
    const result = await runLintCommand({ inputPath: fixturePath });
    const sarif = JSON.parse(formatSarifLog(result, { inputPath: 'flows.json' })) as {
      version: string;
      $schema: string;
      runs: Array<{
        tool: { driver: { rules: Array<{ id: string }> } };
        results: Array<{ ruleId: string; fixes?: Array<{ description: { text: string } }> }>;
      }>;
    };

    expect(sarif.version).toBe('2.1.0');
    expect(sarif.$schema).toContain('sarif-schema-2.1.0.json');
    expect(sarif.runs[0].tool.driver.rules.length).toBeGreaterThan(0);
    expect(sarif.runs[0].results.length).toBe(result.findings.length);
    expect(sarif.runs[0].results.some((entry) => entry.fixes?.[0]?.description.text)).toBe(true);
  });
});
