import type { Capability } from '@flow-profile/core';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import CapabilityPanel from './CapabilityPanel.vue';

const makeTool = (overrides: Partial<Capability> = {}): Capability => ({
  type: 'tool',
  name: 'send-email',
  description: 'Sends email via SMTP',
  nodeId: 'node-1',
  nodeName: 'Email Node',
  confidence: 'high',
  inferred: false,
  ...overrides,
});

const makeResource = (overrides: Partial<Capability> = {}): Capability => ({
  type: 'resource',
  name: 'config-store',
  description: 'Reads global context',
  nodeId: 'node-2',
  nodeName: 'Context Node',
  confidence: 'high',
  inferred: false,
  ...overrides,
});

describe('CapabilityPanel', () => {
  it('shows empty state when no capabilities', () => {
    const wrapper = mount(CapabilityPanel, {
      props: { tools: [], resources: [] },
    });
    expect(wrapper.text()).toContain('No capability surface yet');
    expect(wrapper.text()).toContain('Load a flow to infer tools and resources');
  });

  it('renders tool and resource counts in header', () => {
    const wrapper = mount(CapabilityPanel, {
      props: {
        tools: [makeTool()],
        resources: [makeResource(), makeResource({ nodeId: 'node-3', nodeName: 'Other' })],
      },
    });
    expect(wrapper.text()).toContain('Tools: 1');
    expect(wrapper.text()).toContain('Resources: 2');
  });

  it('calculates uncertain count from inferred or non-high confidence', () => {
    const wrapper = mount(CapabilityPanel, {
      props: {
        tools: [
          makeTool({ confidence: 'high', inferred: false }),
          makeTool({ nodeId: 'n2', nodeName: 'B', confidence: 'medium', inferred: false }),
        ],
        resources: [makeResource({ confidence: 'high', inferred: true })],
      },
    });
    // n2 (medium) and resource (inferred) = 2 uncertain
    expect(wrapper.text()).toContain('Uncertain: 2');
  });

  it('renders tool entries with name and description', () => {
    const tool = makeTool({ name: 'deploy-flow', description: 'Deploys to runtime' });
    const wrapper = mount(CapabilityPanel, {
      props: { tools: [tool], resources: [] },
    });
    expect(wrapper.text()).toContain('deploy-flow');
    expect(wrapper.text()).toContain('Deploys to runtime');
  });

  it('renders resource entries', () => {
    const resource = makeResource({ name: 'env-vars', description: 'Environment variables' });
    const wrapper = mount(CapabilityPanel, {
      props: { tools: [], resources: [resource] },
    });
    expect(wrapper.text()).toContain('env-vars');
    expect(wrapper.text()).toContain('Environment variables');
  });

  it('shows empty tool/resource messages', () => {
    const wrapper = mount(CapabilityPanel, {
      props: { tools: [], resources: [makeResource()] },
    });
    expect(wrapper.text()).toContain('No tool capabilities detected yet');
  });

  it('emits select-capability on node button click', async () => {
    const tool = makeTool({ nodeId: 'node-42' });
    const wrapper = mount(CapabilityPanel, {
      props: { tools: [tool], resources: [] },
    });
    const nodeButton = wrapper.findAll('button').find((btn) => btn.text() === 'Email Node');
    if (!nodeButton) throw new Error('Expected node button for Email Node');
    await nodeButton.trigger('click');
    expect(wrapper.emitted('select-capability')).toEqual([['node-42']]);
  });

  it('shows inferred badge for inferred capabilities', () => {
    const tool = makeTool({ inferred: true });
    const wrapper = mount(CapabilityPanel, {
      props: { tools: [tool], resources: [] },
    });
    expect(wrapper.text()).toContain('inferred');
  });

  it('applies selected style to matching selectedIds', () => {
    const tool = makeTool({ nodeId: 'sel-1' });
    const wrapper = mount(CapabilityPanel, {
      props: { tools: [tool], resources: [], selectedIds: ['sel-1'] },
    });
    const nodeButton = wrapper.findAll('button').find((btn) => btn.text() === 'Email Node');
    expect(nodeButton?.classes()).toContain('border-sky-400/60');
  });
});
