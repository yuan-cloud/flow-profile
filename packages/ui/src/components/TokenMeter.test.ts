import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import TokenMeter from './TokenMeter.vue';

const defaultBreakdown = {
  summary: 500,
  nodeDescriptions: 2000,
  functionCode: 1200,
  riskFindings: 300,
};

const baseProps = {
  current: 4000,
  budget: 8000,
  breakdown: defaultBreakdown,
};

describe('TokenMeter', () => {
  it('displays formatted token counts', () => {
    const wrapper = mount(TokenMeter, { props: baseProps });
    expect(wrapper.find('.token-meter__value').text()).toContain('4,000');
    expect(wrapper.find('.token-meter__value').text()).toContain('8,000');
  });

  it('calculates and shows percentage', () => {
    const wrapper = mount(TokenMeter, { props: baseProps });
    expect(wrapper.find('.token-meter__percent').text()).toBe('50%');
  });

  it('auto-detects ok status when under 80%', () => {
    const wrapper = mount(TokenMeter, { props: baseProps });
    expect(wrapper.find('.token-meter__status').text()).toBe('OK');
  });

  it('auto-detects warning status at 80%+', () => {
    const wrapper = mount(TokenMeter, {
      props: { ...baseProps, current: 6500 },
    });
    expect(wrapper.find('.token-meter__status').text()).toBe('Near limit');
    expect(wrapper.find('.token-meter__status').attributes('data-status')).toBe('warning');
  });

  it('auto-detects over status above 100%', () => {
    const wrapper = mount(TokenMeter, {
      props: { ...baseProps, current: 9000 },
    });
    expect(wrapper.find('.token-meter__status').text()).toBe('Over budget');
    expect(wrapper.find('.token-meter__status').attributes('data-status')).toBe('over');
  });

  it('uses explicit status when not auto', () => {
    const wrapper = mount(TokenMeter, {
      props: { ...baseProps, status: 'warning' as const },
    });
    expect(wrapper.find('.token-meter__status').text()).toBe('Near limit');
  });

  it('renders breakdown items', () => {
    const wrapper = mount(TokenMeter, { props: baseProps });
    const items = wrapper.findAll('.token-meter__item');
    expect(items).toHaveLength(4);
    expect(items[0].find('.token-meter__item-label').text()).toBe('Summary');
    expect(items[0].find('.token-meter__item-value').text()).toBe('500 tokens');
  });

  it('emits select-breakdown on item click', async () => {
    const wrapper = mount(TokenMeter, { props: baseProps });
    await wrapper.findAll('.token-meter__item')[1].trigger('click');
    expect(wrapper.emitted('select-breakdown')).toEqual([['nodeDescriptions']]);
  });

  it('shows default presets when none provided', () => {
    const wrapper = mount(TokenMeter, { props: baseProps });
    const options = wrapper.findAll('.token-meter__select option');
    expect(options.length).toBeGreaterThanOrEqual(4); // 3 defaults + custom
    expect(options[0].text()).toBe('GPT-4 8K');
  });

  it('shows custom presets when provided', () => {
    const wrapper = mount(TokenMeter, {
      props: {
        ...baseProps,
        presets: [
          { label: 'Small', value: 2000 },
          { label: 'Large', value: 16000 },
        ],
      },
    });
    const options = wrapper.findAll('.token-meter__select option');
    expect(options[0].text()).toBe('Small');
    expect(options[1].text()).toBe('Large');
    expect(options[2].text()).toBe('Custom');
  });

  it('emits update:budget on budget input blur', async () => {
    const wrapper = mount(TokenMeter, { props: baseProps });
    const input = wrapper.find('.token-meter__input');
    await input.setValue('5000');
    await input.trigger('blur');
    expect(wrapper.emitted('update:budget')).toEqual([[5000]]);
  });

  it('clamps negative budget to 0', async () => {
    const wrapper = mount(TokenMeter, { props: baseProps });
    const input = wrapper.find('.token-meter__input');
    await input.setValue('-100');
    await input.trigger('blur');
    expect(wrapper.emitted('update:budget')).toEqual([[0]]);
  });

  it('coerces non-numeric budget input to 0 via DOM number input', async () => {
    // DOM number inputs coerce non-numeric strings to empty string,
    // and Number('') === 0, so the budget emits 0.
    const wrapper = mount(TokenMeter, { props: baseProps });
    const input = wrapper.find('.token-meter__input');
    await input.setValue('abc');
    await input.trigger('blur');
    expect(wrapper.emitted('update:budget')).toEqual([[0]]);
  });

  it('handles zero budget without errors', () => {
    const wrapper = mount(TokenMeter, {
      props: { ...baseProps, budget: 0 },
    });
    expect(wrapper.find('.token-meter__percent').text()).toBe('0%');
  });

  it('formats large numbers with commas', () => {
    const wrapper = mount(TokenMeter, {
      props: { ...baseProps, current: 128000, budget: 200000 },
    });
    expect(wrapper.find('.token-meter__value').text()).toContain('128,000');
    expect(wrapper.find('.token-meter__value').text()).toContain('200,000');
  });
});
