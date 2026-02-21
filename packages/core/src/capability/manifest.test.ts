import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseFlow } from '../parser/parse.js';
import type { CapabilityManifest } from './manifest.js';
import { buildCapabilityManifest } from './manifest.js';

const fixturePath = path.resolve(
  __dirname,
  '../../../../testdata/fixtures/capability-surface.json',
);
const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');
const fixtureData = JSON.parse(fixtureContent) as unknown;

const expected: CapabilityManifest = {
  tools: [
    {
      type: 'tool',
      name: 'Execute system command',
      description: 'Execute system command: uptime',
      nodeId: 'exec-cap',
      nodeName: 'Run command',
      confidence: 'high',
      inferred: false,
    },
    {
      type: 'tool',
      name: 'Write to file',
      description: 'Write to file: /var/data/output.txt',
      nodeId: 'file-out-cap',
      nodeName: 'Write file',
      confidence: 'high',
      inferred: false,
    },
    {
      type: 'tool',
      name: 'Respond to HTTP requests',
      description: 'Respond to HTTP requests',
      nodeId: 'http-response-cap',
      nodeName: 'Respond',
      confidence: 'high',
      inferred: false,
    },
    {
      type: 'tool',
      name: 'Publish to MQTT topic',
      description: 'Publish to MQTT topic: alerts/temperature',
      nodeId: 'mqtt-out-cap',
      nodeName: 'MQTT output',
      confidence: 'high',
      inferred: false,
    },
  ],
  resources: [
    {
      type: 'resource',
      name: 'File input',
      description: 'File: /var/data/input.txt',
      nodeId: 'file-in-cap',
      nodeName: 'Read file',
      confidence: 'high',
      inferred: false,
    },
    {
      type: 'resource',
      name: 'HTTP endpoint',
      description: 'HTTP endpoint: GET /api/cap',
      nodeId: 'http-in-cap',
      nodeName: 'HTTP endpoint',
      confidence: 'high',
      inferred: false,
    },
    {
      type: 'resource',
      name: 'MQTT subscription',
      description: 'MQTT subscription: sensors/temperature',
      nodeId: 'mqtt-in-cap',
      nodeName: 'MQTT input',
      confidence: 'high',
      inferred: false,
    },
  ],
  metadata: {
    totalNodes: 9,
    analyzedNodes: 7,
    uncertainCount: 0,
  },
};

describe('capability manifest', () => {
  it('generates capability manifest for fixture', () => {
    const flow = parseFlow(fixtureData);
    const result = buildCapabilityManifest(flow);

    expect(result).toEqual(expected);
  });
});
