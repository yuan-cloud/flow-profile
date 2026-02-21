import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import RiskCard from './RiskCard.vue';

describe('RiskCard', () => {
  const baseProps = {
    title: 'Hardcoded secret',
    description: 'A password was found in node config.',
  };

  it('renders title and description', () => {
    const wrapper = mount(RiskCard, { props: baseProps });
    expect(wrapper.find('.risk-card__title').text()).toBe('Hardcoded secret');
    expect(wrapper.find('.risk-card__description').text()).toBe(
      'A password was found in node config.',
    );
  });

  it('defaults severity to LOW', () => {
    const wrapper = mount(RiskCard, { props: baseProps });
    expect(wrapper.find('.risk-card__severity').text()).toBe('LOW');
    expect(wrapper.attributes('data-severity')).toBe('low');
  });

  it('displays uppercase severity badge', () => {
    const wrapper = mount(RiskCard, {
      props: { ...baseProps, severity: 'high' as const },
    });
    expect(wrapper.find('.risk-card__severity').text()).toBe('HIGH');
    expect(wrapper.attributes('data-severity')).toBe('high');
  });

  it('hides action button when nodeId is not provided', () => {
    const wrapper = mount(RiskCard, { props: baseProps });
    expect(wrapper.find('.risk-card__action').exists()).toBe(false);
  });

  it('shows View node button when nodeId is provided', () => {
    const wrapper = mount(RiskCard, {
      props: { ...baseProps, nodeId: 'abc123' },
    });
    expect(wrapper.find('.risk-card__action').text()).toBe('View node');
  });

  it('emits select with nodeId on button click', async () => {
    const wrapper = mount(RiskCard, {
      props: { ...baseProps, nodeId: 'node-42' },
    });
    await wrapper.find('.risk-card__action').trigger('click');
    expect(wrapper.emitted('select')).toEqual([['node-42']]);
  });

  it('renders as an article element', () => {
    const wrapper = mount(RiskCard, { props: baseProps });
    expect(wrapper.element.tagName).toBe('ARTICLE');
  });
});
