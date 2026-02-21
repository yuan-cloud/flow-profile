import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import CapabilityCard from './CapabilityCard.vue';

describe('CapabilityCard', () => {
  const toolProps = {
    name: 'send-email',
    description: 'Sends email via SMTP node',
    type: 'tool' as const,
  };

  const resourceProps = {
    name: 'config-store',
    description: 'Reads from global context',
    type: 'resource' as const,
  };

  it('renders name and description', () => {
    const wrapper = mount(CapabilityCard, { props: toolProps });
    expect(wrapper.find('.capability-card__name').text()).toBe('send-email');
    expect(wrapper.find('.capability-card__description').text()).toBe('Sends email via SMTP node');
  });

  it('displays Tool label for tool type', () => {
    const wrapper = mount(CapabilityCard, { props: toolProps });
    expect(wrapper.find('.capability-card__type').text()).toBe('Tool');
    expect(wrapper.attributes('data-type')).toBe('tool');
  });

  it('displays Resource label for resource type', () => {
    const wrapper = mount(CapabilityCard, { props: resourceProps });
    expect(wrapper.find('.capability-card__type').text()).toBe('Resource');
    expect(wrapper.attributes('data-type')).toBe('resource');
  });

  it('defaults confidence to medium', () => {
    const wrapper = mount(CapabilityCard, { props: toolProps });
    expect(wrapper.find('.capability-card__confidence').text()).toBe('Confidence: medium');
  });

  it('displays provided confidence level', () => {
    const wrapper = mount(CapabilityCard, {
      props: { ...toolProps, confidence: 'high' as const },
    });
    expect(wrapper.find('.capability-card__confidence').text()).toBe('Confidence: high');
  });

  it('hides action button when nodeId is not provided', () => {
    const wrapper = mount(CapabilityCard, { props: toolProps });
    expect(wrapper.find('.capability-card__action').exists()).toBe(false);
  });

  it('shows View node button and emits select on click', async () => {
    const wrapper = mount(CapabilityCard, {
      props: { ...toolProps, nodeId: 'n-99' },
    });
    const button = wrapper.find('.capability-card__action');
    expect(button.text()).toBe('View node');
    await button.trigger('click');
    expect(wrapper.emitted('select')).toEqual([['n-99']]);
  });
});
