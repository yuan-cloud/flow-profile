import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';

import { detectRisks, parseFlow } from '@flow-profile/core';
import { describe, expect, it } from 'vitest';

import { runCli } from '../cli.js';
import { computeLintExitCode, formatLintResult, runLintCommand } from '../commands/lint.js';
import { createLintPrivacy } from '../output/lint-privacy.js';
import { formatSarifLog } from '../output/sarif.js';

// Synthetic probes authored for fp-lumen-handoff-mmy.1; never real credentials.
const secret = 'SYNTHETIC-0123456789-abcdefghijklmnopqrstuvwxyz';
const alias = 'rosebud';
const nodeId = `private-${secret}`;
const flow = [
  { id: 'garden', type: 'tab', label: `Garden ${alias}` },
  { id: 'config', type: 'mqtt-broker', password: alias },
  {
    id: nodeId,
    type: 'exec',
    name: `Actuator ${alias} ${secret}`,
    z: 'garden',
    x: 100,
    y: 100,
    password: alias,
    [secret]: 'ordinary value',
    wires: [['safe']],
  },
  { id: 'safe', type: 'debug', name: 'Safe output', z: 'garden', x: 200, y: 100, wires: [] },
];

const formats = ['text', 'json', 'sarif'] as const;
const destinations = ['stdout', 'file'] as const;

function capture() {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  let output = '';
  let out = '';
  let err = '';
  stdout.on('data', (chunk) => {
    output += chunk.toString();
    out += chunk.toString();
  });
  stderr.on('data', (chunk) => {
    output += chunk.toString();
    err += chunk.toString();
  });
  return { io: { stdout, stderr }, read: () => output, stdout: () => out, stderr: () => err };
}

async function fixture(value: unknown = flow) {
  const dir = await mkdtemp(path.join(tmpdir(), 'flow-profile-lint-privacy-'));
  const input = path.join(dir, `${secret}.json`);
  await writeFile(input, JSON.stringify(value));
  return { dir, input };
}

function expectPrivate(text: string, input?: string) {
  expect(text.includes(secret), 'high-entropy probe disclosed').toBe(false);
  expect(text.includes(alias), 'known low-entropy alias disclosed').toBe(false);
  expect(text.includes(nodeId), 'source identifier disclosed').toBe(false);
  if (input) {
    expect(text.includes(input), 'input filename disclosed').toBe(false);
    expect(text.includes(path.dirname(input)), 'input directory disclosed').toBe(false);
  }
}

function expectStructuredReport(format: string, report: string) {
  if (format === 'text') return;
  const parsed = JSON.parse(report);
  const count = detectRisks(parseFlow(flow)).findings.length;
  if (format === 'json') {
    expect(parsed.findingCount).toBe(count);
    return;
  }
  expect(parsed.version).toBe('2.1.0');
  expect(parsed.runs[0].results).toHaveLength(count);
  for (const result of parsed.runs[0].results) {
    expect(result.locations).toBeUndefined();
    expect(result.properties.inputRef).toMatch(/^urn:flow-profile:input:\d+$/);
  }
}

describe('lint disclosure contract (fp-lumen-handoff-mmy.1)', () => {
  it('R1: avoids partial masking of an explicit label duplicated by public type context', async () => {
    const { input } = await fixture([
      { id: 't', type: 'tab', label: 'Main' },
      { id: 'd', type: 'debug', name: 'debug', password: 'bug', z: 't', x: 1, y: 1, wires: [] },
    ]);
    const result = await runLintCommand({ inputPath: input });
    expect(
      result.findings.flatMap((f) => f.affectedNodes).every((n) => n.name === '[REDACTED]'),
    ).toBe(true);
    expect(JSON.stringify(result)).not.toContain('de[REDACTED]');
    expect(result.findings.find((f) => f.id === 'RISK_NO_CATCH')?.evidence).toContain(
      'Output types: debug',
    );
  });

  it('R1: preserves each original display label even when source IDs are duplicated', async () => {
    const { input } = await fixture([
      { id: 't', type: 'tab', label: 'Main' },
      { id: 'b', type: 'mqtt-broker', password: 'bug' },
      { id: 'd', type: 'debug', z: 't', x: 1, y: 1, wires: [] },
      { id: 'd', type: 'debug', name: 'Harmless sink', z: 't', x: 2, y: 1, wires: [] },
    ]);
    const result = await runLintCommand({ inputPath: input });
    expect(
      result.findings.find((f) => f.id === 'RISK_NO_CATCH')?.affectedNodes.map((n) => n.name),
    ).toEqual(['debug', 'Harmless sink']);
  });

  it.each([
    ['mqtt out', 'mqtt'],
    ['exec', 'exec'],
    ['debug', 'bug'],
    ['debug', 'debug'],
    ['function', 'function'],
    ['catch', 'catch'],
  ])('R1: preserves public type %s independently of password %s', async (type, password) => {
    const id = type === 'catch' ? type : 'n';
    const value = [
      { id: 't', type: 'tab', label: 'Main' },
      { id, type, password, z: 't', x: 1, y: 1, wires: [[id]] },
    ];
    const { input } = await fixture(value);
    const result = await runLintCommand({ inputPath: input });
    expect(result.findingCount).toBe(detectRisks(parseFlow(value)).findings.length);
    expect(result.findings.flatMap((f) => f.affectedNodes).map((n) => n.name)).toEqual(
      expect.arrayContaining([type]),
    );
    for (const node of result.findings.flatMap((f) => f.affectedNodes))
      expect(node.name).toBe(type);
    for (const format of formats) {
      const io = capture();
      expect(
        await runCli(['lint', '--in', input, '--format', format, '--fail-on', 'warn'], io.io),
      ).toBe(2);
      expect(io.stderr()).toBe('');
      expect(io.stdout()).toContain(type);
      expect(io.stdout()).not.toContain('[REDACTED]');
    }
  });

  it.each([
    'tulipmothConfig',
    'mytulipmoth',
    'k7m2x9q4w8e1r5t3y6u0i2o4p7a9s1d3f5g8h0j2z',
    'passwordZq7Lm2Xv9Kt4Rb6Hw1Ny8Dc3Pf5Gj0Aa1Bb2Cc3',
  ])('R2: protects recognized aliases and entropy in key %s', async (key) => {
    const value = [
      { id: 't', type: 'tab', label: 'Main' },
      { id: 'b', type: 'mqtt-broker', password: 'tulipmoth' },
      {
        id: 'd',
        type: 'debug',
        name: 'Harmless sink',
        z: 't',
        x: 1,
        y: 1,
        wires: [],
        [key]: { endpoint: secret },
      },
    ];
    const { input } = await fixture(value);
    const result = await runLintCommand({ inputPath: input });
    expect(result.findingCount).toBe(detectRisks(parseFlow(value)).findings.length);
    for (const format of formats) {
      const io = capture();
      await runCli(['lint', '--in', input, '--format', format], io.io);
      for (const probe of [key, 'tulipmoth', secret]) expect(io.read().includes(probe)).toBe(false);
      expect(io.stdout()).toContain('Harmless sink');
    }
    expect(JSON.stringify(result)).not.toContain(key);
  });

  it.each([
    "Zq7#Lm2$Xv9@Kt4!Rb6'Hw1&Ny8*Dc3(Pf5)Gj0",
    'Zq7#Lm2$Xv9"Kt4!Rb6<Hw1&Ny8>Dc3(Pf5`Gj0',
    "ЖзИйКлМнОπΡσΤυΦχΨω甲乙'丙丁戊己庚辛壬癸一二三四五六七八九",
  ])('R3: masks whole whitespace runs before splitting internal punctuation', async (token) => {
    const { input } = await fixture([
      { id: 't', type: 'tab', label: 'Main' },
      { id: 'd', type: 'debug', name: `Deploy key ${token}`, z: 't', x: 1, y: 1, wires: [] },
    ]);
    for (const format of formats) {
      const io = capture();
      expect(
        await runCli(['lint', '--in', input, '--format', format, '--fail-on', 'warn'], io.io),
      ).toBe(2);
      expect(io.stderr()).toBe('');
      expect(io.stdout()).toContain('Deploy key');
      for (const part of token.split(/["'`<>]/u))
        if (part.length >= 6) expect(io.stdout().includes(part)).toBe(false);
    }
  });

  it('R4: protects cycle metadata, prose names and the complete cycle identifier path', async () => {
    const ids = ['cust-cycle-left-7', 'cust-cycle-right-9'];
    const value = [
      { id: 't', type: 'tab', label: 'Main' },
      { id: 'b', type: 'mqtt-broker', password: alias },
      { id: ids[0], type: 'function', z: 't', x: 1, y: 1, wires: [[ids[1]]] },
      {
        id: ids[1],
        type: 'function',
        name: `Transform ${alias} ${secret}`,
        z: 't',
        x: 2,
        y: 1,
        wires: [[ids[0]]],
      },
    ];
    const { input } = await fixture(value);
    const result = await runLintCommand({ inputPath: input });
    const loop = result.findings.find((f) => f.id === 'RISK_INFINITE_LOOP');
    expect(loop?.affectedNodes).toHaveLength(2);
    const displayedIds = loop?.affectedNodes.map((n) => n.id) ?? [];
    expect(loop?.evidence).toBe(
      `Cycle found: ${[...displayedIds, displayedIds[0]].join(' -> ')} (no delay)`,
    );
    for (const name of loop?.affectedNodes.map((n) => n.name) ?? [])
      expect(loop?.description).toContain(name);
    for (const format of formats) {
      const io = capture();
      await runCli(['lint', '--in', input, '--format', format], io.io);
      for (const probe of [...ids, alias, secret]) expect(io.read().includes(probe)).toBe(false);
    }
  });

  it('R4: protects unnamed input paths and function/exec metadata while retaining risk evidence', async () => {
    const ids = ['i', 'cust-eval-function-9', 'cust-exec-output-3'] as const;
    const { input } = await fixture([
      { id: 't', type: 'tab', label: 'Main' },
      { id: ids[0], type: 'http in', z: 't', x: 1, y: 1, wires: [[ids[1]]] },
      {
        id: ids[1],
        type: 'function',
        func: 'return eval(msg.payload)',
        z: 't',
        x: 2,
        y: 1,
        wires: [[ids[2]]],
      },
      { id: ids[2], type: 'exec', name: `Actuator ${secret}`, z: 't', x: 3, y: 1, wires: [] },
    ]);
    const result = await runLintCommand({ inputPath: input });
    const injection = result.findings.filter((f) => f.id === 'RISK_INJECTION_PRONE');
    expect(injection).toHaveLength(2);
    for (const f of injection) {
      expect(f.affectedNodes.every((n) => /^node-\d+$/.test(n.id))).toBe(true);
      expect(f.evidence.split('. ')[0]?.split(' -> ')).toEqual(
        f.affectedNodes.map((n) => (n.name === 'http in' || n.name === 'function' ? n.id : n.name)),
      );
    }
    expect(injection.some((f) => f.evidence.includes('Function contains risky pattern'))).toBe(
      true,
    );
    expect(injection.some((f) => f.evidence.includes('can execute arbitrary commands'))).toBe(true);
    for (const format of formats) {
      const io = capture();
      await runCli(['lint', '--in', input, '--format', format], io.io);
      for (const probe of [ids[1], ids[2], secret]) expect(io.read().includes(probe)).toBe(false);
    }
  });

  it('R4: aliases source references in labels at bare and punctuated boundaries', async () => {
    const id = 'cust-plant-sink-22';
    const { input } = await fixture([
      { id: 't', type: 'tab', label: 'Main' },
      { id, type: 'debug', name: 'Harmless sink', z: 't', x: 1, y: 1, wires: [] },
      {
        id: 'd',
        type: 'debug',
        name: `forward to ${id} and (${id}).`,
        z: 't',
        x: 2,
        y: 1,
        wires: [],
      },
    ]);
    const result = await runLintCommand({ inputPath: input });
    const nodes = result.findings.find((f) => f.id === 'RISK_NO_CATCH')?.affectedNodes ?? [];
    const target = nodes.find((n) => n.name === 'Harmless sink');
    expect(nodes.find((n) => n.name.startsWith('forward'))?.name).toBe(
      `forward to ${target?.id} and (${target?.id}).`,
    );
  });

  it('R4: frozen but unmarked caller findings still pass through both formatter boundaries', () => {
    const raw = detectRisks(parseFlow(flow));
    const original = raw.findings[0];
    if (!original) throw new Error('Synthetic fixture must produce a finding');
    // No original-input context: exercise entropy/identity handling, not unknown low-entropy aliases.
    const value = Object.freeze({
      ...original,
      title: `Review ${secret}`,
      description: 'Synthetic finding',
      evidence: `Evidence ${secret}`,
      remediation: 'Review safely',
      affectedNodes: [{ id: nodeId, name: `Actuator ${secret}` }],
      filePath: `/private/${secret}.json`,
      level: 'warn' as const,
    });
    const result = {
      findings: [value],
      files: [],
      findingCount: 1,
      errorCount: 0,
      warningCount: 1,
      rulesExecuted: raw.rulesExecuted,
    };
    expectPrivate(formatLintResult(result));
    expectPrivate(formatSarifLog(result, { inputPath: value.filePath }));
    expect(value.title).toBe(`Review ${secret}`);
  });

  it('R4: masks a recognized suffix when it is also the prefix of a longer secret', () => {
    const privacy = createLintPrivacy([], [{ password: 'he', token: 'shex' }]);
    expect(privacy.presentation.nodeName('d', 'she lighthouse')).toBe('s[REDACTED] lighthouse');
  });

  it('L1: retains protection for long recognized values embedded in a display label', async () => {
    const long = 'synthetic-long-value-'.repeat(300);
    const { input } = await fixture([
      { id: 't', type: 'tab', label: 'Main' },
      {
        id: 'd',
        type: 'debug',
        name: `Echo ${long}`,
        password: long,
        z: 't',
        x: 1,
        y: 1,
        wires: [],
      },
    ]);
    const result = await runLintCommand({ inputPath: input });
    expect(result.findingCount).toBeGreaterThan(0);
    expect(JSON.stringify(result).includes(long)).toBe(false);
  });

  it.each([
    'catch',
    'e',
    'password',
  ])('F1: never masks static rule wording for password %s', async (password) => {
    const { input } = await fixture([
      { id: 't', type: 'tab', label: 'Main' },
      { id: 'd', type: 'debug', name: 'Safe output', password, z: 't', x: 1, y: 1, wires: [] },
    ]);
    const result = await runLintCommand({ inputPath: input });
    expect(result.findings.find((f) => f.id === 'RISK_NO_CATCH')?.title).toBe(
      'No catch node in flow "Main"',
    );
    expect(result.findings.find((f) => f.id === 'RISK_HIGH_ENTROPY')?.description).toContain(
      'raw.password',
    );
  });

  it('F2/F6: uses ordered logical input references, never a real-looking SARIF filename', async () => {
    const { dir } = await fixture([]);
    const names = ['B-upper.json', 'a-lower.json', 'flow-1.json', 'zeta space.json'];
    const counts = new Map<string, number>();
    for (const [i, name] of names.entries()) {
      const value =
        i === 2
          ? []
          : [
              { id: 't', type: 'tab', label: 'Main' },
              { id: `d${i}`, type: 'debug', name: 'Safe output', z: 't', x: 1, y: 1, wires: [] },
            ];
      await writeFile(path.join(dir, name), JSON.stringify(value));
      counts.set(name, detectRisks(parseFlow(value)).findings.length);
    }
    const result = await runLintCommand({ inputPath: dir, include: names });
    const ordered = [...names].sort((a, b) => a.localeCompare(b));
    expect(result.files.map((file) => file.filePath)).toEqual(
      ordered.map((_, i) => `urn:flow-profile:input:${i + 1}`),
    );
    expect(result.files.map((file) => file.findingCount)).toEqual(
      ordered.map((name) => counts.get(name)),
    );
    const sarif = JSON.parse(formatSarifLog(result, { inputPath: dir }));
    expect(
      sarif.runs[0].results.every(
        (r: { locations?: unknown; properties: { inputRef: string } }) =>
          r.locations === undefined && r.properties.inputRef.startsWith('urn:flow-profile:input:'),
      ),
    ).toBe(true);
  });

  it('F3: protects an unnamed tab identifier in every renderer', async () => {
    const id = 'tab-acme-plant-north';
    const { input } = await fixture([
      { id, type: 'tab' },
      { id: 'd', type: 'debug', name: 'Safe output', z: id, x: 1, y: 1, wires: [] },
    ]);
    const result = await runLintCommand({ inputPath: input });
    for (const text of [
      JSON.stringify(result),
      formatLintResult(result),
      formatSarifLog(result, { inputPath: input }),
    ])
      expect(text.includes(id)).toBe(false);
  });

  it.each([
    'Zq7#Lm2$Xv9@Kt4!Rb6^Hw1&Ny8*Dc3(Pf5)Gj0',
    'ЖзИйКлМнОπΡσΤυΦχΨω甲乙丙丁戊己庚辛壬癸一二三四五六七八九',
  ])('F4: masks a symbol-rich or Unicode token in user content', async (token) => {
    const { input } = await fixture([
      { id: 't', type: 'tab', label: 'Main' },
      { id: 'd', type: 'debug', name: `Deploy key ${token}`, z: 't', x: 1, y: 1, wires: [] },
    ]);
    const result = await runLintCommand({ inputPath: input });
    expect(JSON.stringify(result).includes(token)).toBe(false);
  });

  it('F5: keeps useful, private diagnostic categories', async () => {
    const { input, dir } = await fixture();
    const bad = path.join(dir, 'invalid.json');
    await writeFile(bad, '{');
    const cases = [
      { args: [], hint: 'input' },
      { args: ['--in', input, '--format', secret], hint: 'format' },
      { args: ['--in', input, '--only', secret], hint: 'rule' },
      { args: ['--in', bad], hint: 'JSON' },
      { args: ['--in', path.join(dir, secret)], hint: 'read' },
      { args: ['--in', input, '--output', dir], hint: 'write' },
    ];
    const messages = new Set<string>();
    for (const item of cases) {
      const io = capture();
      expect(await runCli(['lint', ...item.args], io.io)).toBe(1);
      expect(io.read()).toContain(item.hint);
      expect(io.read().includes(secret)).toBe(false);
      messages.add(io.read());
    }
    expect(messages.size).toBe(cases.length);
  });

  it('F7/F8: preserves structured field paths and static prose with word-like IDs', async () => {
    const { input } = await fixture([
      { id: 't', type: 'tab', label: 'Main' },
      {
        id: 'catch',
        type: 'debug',
        name: 'caña output',
        z: 't',
        x: 1,
        y: 1,
        wires: [],
        awsIotCoreMqttBridgeSettings: {
          x509CertificateAndPrivateKeyBundle: { privateKeyPem: secret },
        },
      },
    ]);
    const result = await runLintCommand({ inputPath: input });
    expect(result.findings.find((f) => f.id === 'RISK_NO_CATCH')?.title).toBe(
      'No catch node in flow "Main"',
    );
    expect(formatLintResult(result)).toContain(
      'raw.awsIotCoreMqttBridgeSettings.x509CertificateAndPrivateKeyBundle.privateKeyPem',
    );
    expect(formatLintResult(result)).toContain('caña output');
  });

  it('F9: direct formatters tolerate missing text and reject tainted protocol identifiers', () => {
    const raw = {
      findingCount: 1,
      errorCount: 0,
      warningCount: 1,
      rulesExecuted: [secret],
      files: [],
      findings: [
        {
          id: secret,
          severity: secret,
          confidence: secret,
          level: secret,
          affectedNodes: [{ id: secret }],
        },
      ],
    };
    const result = raw as unknown as Awaited<ReturnType<typeof runLintCommand>>;
    expect(() => formatLintResult(result)).not.toThrow();
    expect(formatLintResult(result).includes(secret)).toBe(false);
    expect(() => formatSarifLog(result, { inputPath: secret })).not.toThrow();
  });

  it('F10: handles twenty thousand affected identifiers without a generated alternation', () => {
    const finding = {
      id: 'RISK_NO_CATCH',
      severity: 'medium' as const,
      confidence: 'high' as const,
      title: 'No catch node in flow "Main"',
      description: 'Output nodes have no catch node.',
      evidence: 'Output nodes lack a handler.',
      remediation: 'Add a catch node.',
      affectedNodes: Array.from({ length: 20000 }, (_, i) => ({
        id: i.toString(16).padStart(16, '0'),
        name: `Debug ${i}`,
      })),
    };
    let succeeded = false;
    try {
      succeeded = createLintPrivacy([finding]).finding(finding).affectedNodes.length === 20000;
    } catch {
      /* Tested failure must not dump the giant old regex into diagnostics. */
    }
    expect(succeeded).toBe(true);
  });

  it('keeps original finding order after introducing aliases', async () => {
    const value = [
      { id: 't', type: 'tab', label: 'Main' },
      ...Array.from({ length: 20 }, (_, i) => ({
        id: String(20 - i),
        type: 'debug',
        name: `Debug ${i}`,
        password: `value-${i}`,
        z: 't',
        x: 1,
        y: 1,
        wires: [],
      })),
    ];
    const { input } = await fixture(value);
    const raw = detectRisks(parseFlow(value));
    const result = await runLintCommand({ inputPath: input });
    expect(
      result.findings.map((f) => [
        f.id,
        f.severity,
        f.confidence,
        f.affectedNodes.map((n) => n.name),
      ]),
    ).toEqual(
      raw.findings.map((f) => [f.id, f.severity, f.confidence, f.affectedNodes.map((n) => n.name)]),
    );
  });

  it('masks overlapping recognized values and private key aliases without rescanning public prose', async () => {
    const { input } = await fixture([
      { id: 't', type: 'tab', label: 'Main' },
      {
        id: 'd',
        type: 'debug',
        name: 'Safe abcde output',
        password: 'abcd',
        token: 'bcde',
        api_key: 'rosebud',
        rosebud: secret,
        [`password-${secret}`]: 'ordinary value',
        z: 't',
        x: 1,
        y: 1,
        wires: [],
      },
    ]);
    const result = await runLintCommand({ inputPath: input });
    const text = JSON.stringify(result);
    expect(text).toContain('Safe [REDACTED] output');
    for (const value of ['abcd', 'bcde', 'rosebud', secret])
      expect(text.includes(value)).toBe(false);
    expect(text).toContain('raw.password');
  });
  it('preserves original-input detection while returning private presentation metadata', async () => {
    const { input } = await fixture();
    const original = detectRisks(parseFlow(flow));
    const result = await runLintCommand({ inputPath: input });
    expectPrivate(JSON.stringify(result), input);
    expect(
      result.findings.map(({ id, severity, confidence }) => ({ id, severity, confidence })),
    ).toEqual(
      original.findings.map(({ id, severity, confidence }) => ({ id, severity, confidence })),
    );
    expect(result.findings.map((f) => f.affectedNodes.length)).toEqual(
      original.findings.map((f) => f.affectedNodes.length),
    );
    expect(result.rulesExecuted).toEqual(original.rulesExecuted.slice().sort());
    expect(result.findingCount).toBe(original.findings.length);
    expect(JSON.stringify(result)).toContain('Safe output');
    expect(result.findings.some((f) => f.id === 'RISK_HIGH_ENTROPY')).toBe(true);
    expect(result.files[0]?.filePath).toMatch(/^urn:flow-profile:input:\d+$/);
    const affectedIds = result.findings.flatMap((f) => f.affectedNodes.map((n) => n.id));
    expect(affectedIds.every((id) => /^node-\d+$/.test(id))).toBe(true);
    const repeated = await runLintCommand({ inputPath: input });
    expect(repeated).toEqual(result);
  });

  for (const format of formats) {
    for (const destination of destinations) {
      it(`${format}/${destination}: protects reports and notices without changing fail-on`, async () => {
        const { dir, input } = await fixture();
        const output = path.join(dir, `output-${secret}.${format}`);
        const io = capture();
        const args = ['lint', '--in', input, '--format', format, '--fail-on', 'warn'];
        if (destination === 'file') args.push('--output', output);
        const exit = await runCli(args, io.io);
        const report = destination === 'file' ? await readFile(output, 'utf8') : io.stdout();
        expect(exit).toBe(2);
        expect(io.stderr()).toBe('');
        expectPrivate(report + io.read(), input);
        expect(report).toContain('Safe output');
        expectStructuredReport(format, report);
      });
    }
  }

  it('does not leak through direct JSON and SARIF formatters or mutate the caller', () => {
    const originalFinding = detectRisks(parseFlow(flow)).findings[0];
    if (!originalFinding) throw new Error('Synthetic fixture must produce a finding');
    const finding = {
      ...originalFinding,
      title: `Review ${secret}`,
      description: `Description ${secret}`,
      evidence: `Evidence ${secret}`,
      remediation: `Remediation ${secret}`,
      affectedNodes: [{ id: nodeId, name: secret }],
      filePath: `/private/${secret}/flows.json`,
      level: 'warn' as const,
    };
    const input = {
      findings: [finding],
      files: [
        {
          filePath: finding.filePath,
          findings: [finding],
          findingCount: 1,
          errorCount: 0,
          warningCount: 1,
        },
      ],
      findingCount: 1,
      errorCount: 0,
      warningCount: 1,
      rulesExecuted: ['RISK_HIGH_ENTROPY'],
    };
    const before = JSON.stringify(input);
    expectPrivate(formatLintResult(input));
    expectPrivate(formatSarifLog(input, { inputPath: finding.filePath }));
    expect(JSON.stringify(input)).toBe(before);
  });

  it('preserves rule selection, configured thresholds, quiet, fail-on and empty results', async () => {
    const { input } = await fixture();
    const result = await runLintCommand(
      { inputPath: input, onlyRules: ['RISK_HIGH_ENTROPY'] },
      { entropyThreshold: 9 },
    );
    const raw = detectRisks(parseFlow(flow), {
      onlyRules: ['RISK_HIGH_ENTROPY'],
      entropyThreshold: 9,
    });
    expect(result.findingCount).toBe(raw.findings.length);
    const io = capture();
    expect(
      await runCli(['lint', '--in', input, '--only', 'RISK_INFINITE_LOOP', '--quiet'], io.io),
    ).toBe(0);
    expect(io.read()).toBe('');
    const off = capture();
    expect(await runCli(['lint', '--in', input, '--fail-on', 'off'], off.io)).toBe(0);
    expectPrivate(off.read(), input);
  });

  it('protects low-entropy aliases even when entropy detection is disabled', async () => {
    const { input } = await fixture();
    const result = await runLintCommand({ inputPath: input }, { strictMode: false });
    expect(result.rulesExecuted).not.toContain('RISK_HIGH_ENTROPY');
    expectPrivate(JSON.stringify(result), input);
  });

  it('preserves configured rule levels and fail-on semantics independently of privacy', async () => {
    const { input, dir } = await fixture();
    const configPath = path.join(dir, 'lint-config.json');
    const config = {
      rules: { RISK_NO_CATCH: 'error' as const },
      failOn: 'error' as const,
      strictMode: false,
    };
    await writeFile(configPath, JSON.stringify(config));
    const result = await runLintCommand({ inputPath: input }, config);
    expect(result.errorCount).toBe(1);
    expect(result.findings.find((finding) => finding.id === 'RISK_NO_CATCH')?.severity).toBe(
      'medium',
    );
    expect(computeLintExitCode(result, 'error')).toBe(2);
    expect(computeLintExitCode(result, 'off')).toBe(0);
    const io = capture();
    expect(await runCli(['lint', '--in', input, '--config', configPath], io.io)).toBe(2);
    expectPrivate(io.read(), input);
  });

  it('keeps ordinary words useful and identifiers distinct when source IDs are short', async () => {
    const { input } = await fixture([
      { id: 't', type: 'tab', label: 'Garden' },
      { id: 'a', type: 'exec', name: 'Safe output', z: 't', x: 1, y: 1, wires: [] },
      { id: 'node-1', type: 'debug', name: 'Other output', z: 't', x: 2, y: 2, wires: [] },
    ]);
    const result = await runLintCommand({ inputPath: input });
    expect(JSON.stringify(result)).toContain('commands');
    expect(JSON.stringify(result)).toContain('Safe output');
    const nodes = result.findings.find((f) => f.id === 'RISK_NO_CATCH')?.affectedNodes ?? [];
    expect(new Set(nodes.map((node) => node.id)).size).toBe(2);
  });

  it('avoids private node/input reference collisions and keeps serialized output stable', async () => {
    const { input } = await fixture([
      { id: 't', type: 'tab', label: 'Garden' },
      {
        id: 'node-1',
        type: 'exec',
        name: 'Safe output',
        password: 'node-1',
        token: 'urn:flow-profile:input:1',
        api_key: 'SECRET_1',
        z: 't',
        x: 1,
        y: 1,
        wires: [],
      },
    ]);
    const result = await runLintCommand({ inputPath: input });
    const values = result.findings.flatMap((finding) =>
      finding.affectedNodes.map((node) => node.id),
    );
    expect(values).not.toContain('node-1');
    expect(result.files[0]?.filePath).not.toBe('urn:flow-profile:input:1');
    expect(JSON.stringify(result).includes('SECRET_1')).toBe(false);
    expect(JSON.parse(formatLintResult(result))).toEqual(result);
  });

  it('preserves distinct files and valid empty results without disclosing their names', async () => {
    const { dir, input } = await fixture([]);
    const another = `another-${secret}.json`;
    await writeFile(path.join(dir, another), JSON.stringify(flow));
    // Exact includes isolate this privacy contract from the existing wildcard-glob defect.
    const result = await runLintCommand({
      inputPath: dir,
      include: [path.basename(input), another],
    });
    expect(result.files).toHaveLength(2);
    expect(new Set(result.files.map((file) => file.filePath)).size).toBe(2);
    expect(result.files.some((file) => file.findingCount === 0)).toBe(true);
    expectPrivate(JSON.stringify(result), input);
    expect(JSON.parse(formatLintResult(result))).toEqual(result);
  });

  it('does not disclose input, configuration, argument or output errors', async () => {
    const { dir, input } = await fixture();
    const malformed = path.join(dir, `invalid-${secret}.json`);
    await writeFile(malformed, `{"${secret}":`);
    const invalidSchema = path.join(dir, `schema-${secret}.json`);
    await writeFile(invalidSchema, JSON.stringify([{ id: 'x', type: secret, x: secret }]));
    const cases = [
      ['--in', path.join(dir, `missing-${secret}.json`)],
      ['--in', malformed],
      ['--in', invalidSchema],
      ['--in', input, '--config', malformed],
      ['--in', input, '--config', path.join(dir, `config-${secret}.json`)],
      ['--in', input, '--only', secret],
      ['--in', input, '--format', secret],
      ['--in', input, `--${secret}`],
      ['--in', input, secret],
      ...formats.map((format) => ['--in', input, '--format', format, '--output', dir]),
    ];
    for (const args of cases) {
      const io = capture();
      expect(await runCli(['lint', ...args], io.io)).toBe(1);
      expect(io.read()).toMatch(/(failed|Error:)/i);
      expectPrivate(io.read(), input);
    }
  });
});
