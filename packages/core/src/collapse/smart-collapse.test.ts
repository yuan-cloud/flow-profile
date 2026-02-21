import { describe, expect, it } from 'vitest';
import {
  calculateCollapseSavings,
  collapseFunctionCode,
  getDefaultCollapseLevel,
  overrideCollapseLevel,
} from './smart-collapse.js';

const sampleNode = {
  id: 'fn-1',
  name: 'processData',
  func: `// Process data\n// Uses API\nconst result = await fetch('https://example.com');\nconst meta = { ok: true };\nconst payload = result;\ntry {\n  msg.payload = payload;\n  msg.meta = meta;\n  msg.count = 1;\n} catch (err) {\n  node.error(err);\n}\nreturn msg;`,
};

describe('smart collapse', () => {
  it('defaults to summary for medium length code', () => {
    expect(getDefaultCollapseLevel(sampleNode)).toBe('summary');
  });

  it('generates signature collapse', () => {
    const result = collapseFunctionCode(sampleNode, 'signature');
    expect(result.collapsedCode).toContain('function processData(msg)');
  });

  it('generates summary collapse with comment lines', () => {
    const result = collapseFunctionCode(sampleNode, 'summary');
    expect(result.collapsedCode).toContain('Process data');
    expect(result.collapsedCode).toContain('...');
  });

  it('allows override to full', () => {
    const result = overrideCollapseLevel(sampleNode, 'full');
    expect(result.collapsedCode).toContain('fetch');
  });

  it('calculates token savings', () => {
    const collapsed = collapseFunctionCode(sampleNode, 'signature');
    const savings = calculateCollapseSavings(sampleNode, collapsed.collapsedCode);
    expect(savings.originalTokens).toBeGreaterThan(0);
    expect(savings.collapsedTokens).toBeGreaterThan(0);
    expect(savings.savings).toBeGreaterThanOrEqual(0);
  });
});
