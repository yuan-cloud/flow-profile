import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ProgressBar from './ProgressBar.vue';

describe('ProgressBar', () => {
  it('renders with default max of 100', () => {
    const wrapper = mount(ProgressBar, { props: { value: 50 } });
    expect(wrapper.attributes('role')).toBe('progressbar');
    expect(wrapper.attributes('aria-valuenow')).toBe('50');
    expect(wrapper.attributes('aria-valuemin')).toBe('0');
    expect(wrapper.attributes('aria-valuemax')).toBe('100');
  });

  it('calculates fill width as percentage', () => {
    const wrapper = mount(ProgressBar, { props: { value: 30, max: 200 } });
    const fill = wrapper.find('.progress-bar__fill');
    expect(fill.attributes('style')).toContain('width: 15%');
  });

  it('clamps percentage to 0-100 range', () => {
    const over = mount(ProgressBar, { props: { value: 200, max: 100 } });
    expect(over.find('.progress-bar__fill').attributes('style')).toContain('width: 100%');

    const under = mount(ProgressBar, { props: { value: -10, max: 100 } });
    expect(under.find('.progress-bar__fill').attributes('style')).toContain('width: 0%');
  });

  it('handles max of 0 without division error', () => {
    const wrapper = mount(ProgressBar, { props: { value: 50, max: 0 } });
    expect(wrapper.find('.progress-bar__fill').attributes('style')).toContain('width: 0%');
  });

  it('hides label by default', () => {
    const wrapper = mount(ProgressBar, { props: { value: 50 } });
    expect(wrapper.find('.progress-bar__label').exists()).toBe(false);
  });

  it('shows percentage label when showLabel is true', () => {
    const wrapper = mount(ProgressBar, { props: { value: 75, max: 100, showLabel: true } });
    expect(wrapper.find('.progress-bar__label').text()).toBe('75%');
  });

  it('shows custom label text when provided', () => {
    const wrapper = mount(ProgressBar, {
      props: { value: 10, max: 100, showLabel: true, label: '10 of 100 items' },
    });
    expect(wrapper.find('.progress-bar__label').text()).toBe('10 of 100 items');
  });

  it('rounds percentage to nearest integer', () => {
    const wrapper = mount(ProgressBar, { props: { value: 1, max: 3, showLabel: true } });
    // 1/3 = 33.33... -> rounds to 33
    expect(wrapper.find('.progress-bar__label').text()).toBe('33%');
  });
});
