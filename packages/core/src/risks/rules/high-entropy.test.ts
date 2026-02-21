import { describe, expect, it } from 'vitest';
import { parseFlow } from '../../parser/parse.js';
import { highEntropyRule } from './high-entropy.js';

const HIGH_ENTROPY_VALUE = Array.from({ length: 64 }, (_, index) =>
  String.fromCharCode(33 + ((index * 7) % 90)),
).join('');
const SHORT_SECRET = String.fromCharCode(112, 52, 115, 115, 119, 48);
const UUID_LIKE_VALUE = [0x550e8400, 0xe29b, 0x41d4, 0xa716, 0x446655440000]
  .map((part, index) => {
    const width = index === 0 ? 8 : index === 4 ? 12 : 4;
    return part.toString(16).padStart(width, '0');
  })
  .join('-');

describe('RISK_HIGH_ENTROPY rule', () => {
  it('flags sensitive fields with high entropy', () => {
    const flow = parseFlow([
      { id: 'tab1', type: 'tab', label: 'Main' },
      {
        id: 'node1',
        type: 'function',
        z: 'tab1',
        name: 'Has Secret',
        x: 100,
        y: 100,
        wires: [],
        apiKey: HIGH_ENTROPY_VALUE,
      },
    ]);

    const findings = highEntropyRule.check(flow);
    expect(findings.length).toBe(1);
    expect(findings[0]?.id).toBe('RISK_HIGH_ENTROPY');
    expect(findings[0]?.severity).toBe('high');
    expect(findings[0]?.confidence).toBe('high');
  });

  it('flags sensitive fields with short values', () => {
    const flow = parseFlow([
      { id: 'tab1', type: 'tab', label: 'Main' },
      {
        id: 'node1',
        type: 'function',
        z: 'tab1',
        name: 'Short Secret',
        x: 100,
        y: 100,
        wires: [],
        apiKey: SHORT_SECRET,
      },
    ]);

    const findings = highEntropyRule.check(flow);
    expect(findings.length).toBe(1);
    expect(findings[0]?.id).toBe('RISK_HIGH_ENTROPY');
  });

  it('flags sensitive fields with uuid-like values', () => {
    const flow = parseFlow([
      { id: 'tab1', type: 'tab', label: 'Main' },
      {
        id: 'node1',
        type: 'function',
        z: 'tab1',
        name: 'UUID Secret',
        x: 100,
        y: 100,
        wires: [],
        apiKey: UUID_LIKE_VALUE,
      },
    ]);

    const findings = highEntropyRule.check(flow);
    expect(findings.length).toBe(1);
    expect(findings[0]?.id).toBe('RISK_HIGH_ENTROPY');
  });

  it('flags non-sensitive high entropy values with medium severity', () => {
    const flow = parseFlow([
      { id: 'tab1', type: 'tab', label: 'Main' },
      {
        id: 'node1',
        type: 'function',
        z: 'tab1',
        name: 'Payload',
        x: 100,
        y: 100,
        wires: [],
        payload: HIGH_ENTROPY_VALUE,
      },
    ]);

    const findings = highEntropyRule.check(flow);
    expect(findings.length).toBe(1);
    expect(findings[0]?.severity).toBe('medium');
    expect(findings[0]?.confidence).toBe('medium');
  });

  it('skips uuid-like values', () => {
    const flow = parseFlow([
      { id: 'tab1', type: 'tab', label: 'Main' },
      {
        id: 'node1',
        type: 'function',
        z: 'tab1',
        name: 'UUID',
        x: 100,
        y: 100,
        wires: [],
        payload: UUID_LIKE_VALUE,
      },
    ]);

    const findings = highEntropyRule.check(flow);
    expect(findings.length).toBe(0);
  });

  it('respects the entropy threshold override', () => {
    const flow = parseFlow([
      { id: 'tab1', type: 'tab', label: 'Main' },
      {
        id: 'node1',
        type: 'function',
        z: 'tab1',
        name: 'Payload',
        x: 100,
        y: 100,
        wires: [],
        payload: HIGH_ENTROPY_VALUE,
      },
    ]);

    const findings = highEntropyRule.check(flow, { entropyThreshold: 10 });
    expect(findings.length).toBe(0);
  });
});
