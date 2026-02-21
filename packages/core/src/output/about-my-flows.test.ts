import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseFlow } from '../parser/parse.js';
import type { AboutMyFlows } from './about-my-flows.js';
import { buildAboutMyFlows } from './about-my-flows.js';

const fixturePath = path.resolve(__dirname, '../../../../testdata/fixtures/simple.json');
const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');
const fixtureData = JSON.parse(fixtureContent) as unknown;

const expected: AboutMyFlows = {
  version: '1.0',
  summary: {
    tabCount: 1,
    nodeCount: 3,
    edgeCount: 1,
    subflowCount: 0,
    configNodeCount: 0,
  },
  tabs: [
    {
      id: 'tab-simple',
      name: 'Simple Flow',
      nodeCount: 3,
      categories: {
        input: 1,
        output: 1,
        logic: 1,
        config: 0,
        subflow: 0,
      },
    },
  ],
  subflows: [],
  nodeTypes: [
    { type: 'comment', count: 1, category: 'logic' },
    { type: 'debug', count: 1, category: 'output' },
    { type: 'inject', count: 1, category: 'input' },
  ],
  ioSurface: {
    inputs: [{ type: 'inject', name: 'Start', nodeId: 'inject-simple' }],
    outputs: [{ type: 'debug', name: 'Log', nodeId: 'debug-simple' }],
  },
};

describe('about-my-flows output', () => {
  it('generates deterministic summary for simple fixture', () => {
    const flow = parseFlow(fixtureData);
    const result = buildAboutMyFlows(flow);

    expect(result).toEqual(expected);
  });
});
