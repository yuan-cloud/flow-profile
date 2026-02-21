import { describe, expect, it } from 'vitest';
import { parseFlow } from '../../parser/parse.js';
import { noCatchRule } from './no-catch.js';

describe('RISK_NO_CATCH rule', () => {
  it('flags tabs with output nodes and no catch node', () => {
    const flow = parseFlow([
      { id: 'tab1', type: 'tab', label: 'Main Flow' },
      { id: 'inject1', type: 'inject', z: 'tab1', x: 100, y: 100, wires: [['debug1']] },
      { id: 'debug1', type: 'debug', z: 'tab1', x: 200, y: 100, wires: [] },
    ]);

    const findings = noCatchRule.check(flow);
    expect(findings.length).toBe(1);
    expect(findings[0]?.id).toBe('RISK_NO_CATCH');
    expect(findings[0]?.affectedNodes.length).toBeGreaterThan(0);
  });

  it('does not flag tabs that include a catch node', () => {
    const flow = parseFlow([
      { id: 'tab1', type: 'tab', label: 'Handled Flow' },
      { id: 'inject1', type: 'inject', z: 'tab1', x: 100, y: 100, wires: [['debug1']] },
      { id: 'debug1', type: 'debug', z: 'tab1', x: 200, y: 100, wires: [] },
      { id: 'catch1', type: 'catch', z: 'tab1', x: 100, y: 200, wires: [['debug1']] },
    ]);

    const findings = noCatchRule.check(flow);
    expect(findings.length).toBe(0);
  });
});
