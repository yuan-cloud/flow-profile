import { describe, expect, it } from 'vitest';
import { parseFlow } from '../../parser/parse.js';
import { infiniteLoopRule } from './infinite-loop.js';

describe('RISK_INFINITE_LOOP rule', () => {
  it('flags cycles without a delay node', () => {
    const flow = parseFlow([
      { id: 'tab1', type: 'tab', label: 'Loop Flow' },
      { id: 'cycle-a', type: 'function', z: 'tab1', x: 100, y: 100, wires: [['cycle-b']] },
      { id: 'cycle-b', type: 'function', z: 'tab1', x: 200, y: 100, wires: [['cycle-c']] },
      { id: 'cycle-c', type: 'function', z: 'tab1', x: 300, y: 100, wires: [['cycle-a']] },
    ]);

    const findings = infiniteLoopRule.check(flow);

    expect(findings.length).toBe(1);
    expect(findings[0]?.id).toBe('RISK_INFINITE_LOOP');
    expect(findings[0]?.affectedNodes.map((n) => n.id)).toEqual(['cycle-a', 'cycle-b', 'cycle-c']);
    expect(findings[0]?.evidence).toContain('cycle-a -> cycle-b -> cycle-c -> cycle-a');
  });

  it('ignores cycles that include delay nodes', () => {
    const flow = parseFlow([
      { id: 'tab1', type: 'tab', label: 'Delayed Loop' },
      { id: 'cycle-a', type: 'function', z: 'tab1', x: 100, y: 100, wires: [['delay-1']] },
      { id: 'delay-1', type: 'delay', z: 'tab1', x: 200, y: 100, wires: [['cycle-a']] },
    ]);

    const findings = infiniteLoopRule.check(flow);

    expect(findings.length).toBe(0);
  });

  it('flags self-loops without delay', () => {
    const flow = parseFlow([
      { id: 'tab1', type: 'tab', label: 'Self Loop' },
      { id: 'self-loop', type: 'function', z: 'tab1', x: 100, y: 100, wires: [['self-loop']] },
    ]);

    const findings = infiniteLoopRule.check(flow);

    expect(findings.length).toBe(1);
    expect(findings[0]?.title).toContain('Self-loop');
    expect(findings[0]?.evidence).toContain('self-loop -> self-loop');
  });
});
