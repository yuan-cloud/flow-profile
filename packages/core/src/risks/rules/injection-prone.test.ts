import { describe, expect, it } from 'vitest';
import { parseFlow } from '../../parser/parse.js';
import { injectionProneRule } from './injection-prone.js';

describe('RISK_INJECTION_PRONE rule', () => {
  it('flags template nodes that use payload from external input', () => {
    const flow = parseFlow([
      { id: 'tab1', type: 'tab', label: 'Template Flow' },
      { id: 'http-in', type: 'http in', z: 'tab1', x: 80, y: 80, wires: [['tmpl']] },
      {
        id: 'tmpl',
        type: 'template',
        z: 'tab1',
        name: 'Greeting',
        template: 'Hello {{payload}}',
        x: 220,
        y: 80,
        wires: [],
      },
    ]);

    const findings = injectionProneRule.check(flow);
    const dynamic = findings.find((finding) =>
      finding.title.includes('Dynamic code with external input'),
    );
    expect(dynamic).toBeDefined();
    expect(dynamic?.confidence).toBe('low');
  });

  it('flags function nodes that eval external input', () => {
    const flow = parseFlow([
      { id: 'tab1', type: 'tab', label: 'Function Flow' },
      { id: 'http-in', type: 'http in', z: 'tab1', x: 80, y: 80, wires: [['fn']] },
      {
        id: 'fn',
        type: 'function',
        z: 'tab1',
        name: 'Dangerous eval',
        func: 'const result = eval(msg.payload); return msg;',
        x: 220,
        y: 80,
        wires: [],
      },
    ]);

    const findings = injectionProneRule.check(flow);
    const dynamic = findings.find((finding) =>
      finding.title.includes('Dynamic code with external input'),
    );
    expect(dynamic).toBeDefined();
  });

  it('flags function nodes with external input even without dangerous patterns', () => {
    const flow = parseFlow([
      { id: 'tab1', type: 'tab', label: 'Safe Flow' },
      { id: 'http-in', type: 'http in', z: 'tab1', x: 80, y: 80, wires: [['fn']] },
      {
        id: 'fn',
        type: 'function',
        z: 'tab1',
        name: 'Safe function',
        func: 'msg.payload = String(msg.payload); return msg;',
        x: 220,
        y: 80,
        wires: [],
      },
    ]);

    const findings = injectionProneRule.check(flow);
    const dynamic = findings.find((finding) =>
      finding.title.includes('Dynamic code with external input'),
    );
    expect(dynamic).toBeDefined();
  });

  it('flags exec nodes even without an input path', () => {
    const flow = parseFlow([
      { id: 'tab1', type: 'tab', label: 'Exec Flow' },
      { id: 'exec1', type: 'exec', z: 'tab1', name: 'Run command', x: 120, y: 120 },
    ]);

    const findings = injectionProneRule.check(flow);
    const execFinding = findings.find((finding) =>
      finding.title.includes('Command execution node'),
    );
    expect(execFinding).toBeDefined();
  });
});
