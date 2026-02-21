import { describe, expect, it } from 'vitest';
import { parseFlow } from '../parser/parse.js';
import { compareFlows, generateFlowDiffMarkdown } from './compare.js';

const buildFlowV1 = () => [
  { id: 'tab-1', type: 'tab', label: 'Main' },
  {
    id: 'fn-1',
    type: 'function',
    z: 'tab-1',
    name: 'Process Data',
    func: 'const result = msg.payload * 2;\nreturn result;',
    x: 120,
    y: 80,
  },
  {
    id: 'dbg-1',
    type: 'debug',
    z: 'tab-1',
    name: 'Old Logger',
    x: 220,
    y: 120,
  },
  {
    id: 'mqtt-1',
    type: 'mqtt-broker',
    name: 'MQTT Config',
    broker: 'mqtt.old.com',
    port: 1883,
  },
];

const buildFlowV2 = () => [
  { id: 'tab-1', type: 'tab', label: 'Main' },
  {
    id: 'fn-1',
    type: 'function',
    z: 'tab-1',
    name: 'Process Data',
    func: 'const result = msg.payload * 3;\nreturn result;',
    x: 120,
    y: 80,
  },
  {
    id: 'rate-1',
    type: 'ratelimit',
    z: 'tab-1',
    name: 'Rate Limiter',
    x: 240,
    y: 80,
  },
  {
    id: 'mqtt-2',
    type: 'mqtt-broker',
    name: 'MQTT Config',
    broker: 'mqtt.new.com',
    port: 1883,
  },
];

describe('compareFlows', () => {
  it('detects added, removed, modified, and id-changed nodes', () => {
    const before = parseFlow(buildFlowV1());
    const after = parseFlow(buildFlowV2());

    const diff = compareFlows(after, before);

    expect(diff.summary.nodesAdded).toBe(1);
    expect(diff.summary.nodesRemoved).toBe(1);
    expect(diff.summary.nodesModified).toBeGreaterThanOrEqual(2);

    const added = diff.addedNodes.find((node) => node.name === 'Rate Limiter');
    expect(added).toBeDefined();

    const removed = diff.removedNodes.find((node) => node.name === 'Old Logger');
    expect(removed).toBeDefined();

    const codeChange = diff.modifiedNodes.find((node) => node.after.name === 'Process Data');
    expect(codeChange?.codeDiff).toContain('-const result = msg.payload * 2;');
    expect(codeChange?.codeDiff).toContain('+const result = msg.payload * 3;');

    const idChange = diff.modifiedNodes.find((node) => node.after.name === 'MQTT Config');
    expect(idChange?.idChanged).toBe(true);
    const brokerChange = idChange?.configChanges.find((change) => change.key === 'broker');
    expect(brokerChange?.before).toContain('mqtt.old.com');
    expect(brokerChange?.after).toContain('mqtt.new.com');
  });

  it('escapes markdown table cells for names with pipes/newlines', () => {
    const before = parseFlow([{ id: 'tab-1', type: 'tab', label: 'Main' }]);
    const after = parseFlow([
      { id: 'tab-1', type: 'tab', label: 'Main' },
      {
        id: 'fn-2',
        type: 'function',
        z: 'tab-1',
        name: 'Pipe | Name\nLine',
        func: 'return msg;',
        x: 10,
        y: 10,
      },
    ]);

    const diff = compareFlows(after, before);
    const markdown = generateFlowDiffMarkdown(diff, {
      beforeLabel: 'before.json',
      afterLabel: 'after.json',
    });

    expect(markdown).toContain('| Pipe \\| Name<br>Line | function | Main |');
  });
});
