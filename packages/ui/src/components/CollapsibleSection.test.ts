import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import CollapsibleSection from './CollapsibleSection.vue';

describe('CollapsibleSection', () => {
  it('renders title text', () => {
    const wrapper = mount(CollapsibleSection, {
      props: { title: 'Risk Findings' },
    });
    expect(wrapper.find('.collapsible__title').text()).toBe('Risk Findings');
  });

  it('hides count badge when count is null', () => {
    const wrapper = mount(CollapsibleSection, {
      props: { title: 'Section' },
    });
    expect(wrapper.find('.collapsible__count').exists()).toBe(false);
  });

  it('shows count badge when count is provided', () => {
    const wrapper = mount(CollapsibleSection, {
      props: { title: 'Nodes', count: 42 },
    });
    expect(wrapper.find('.collapsible__count').text()).toBe('42');
  });

  it('defaults to open state', () => {
    const wrapper = mount(CollapsibleSection, {
      props: { title: 'Open' },
    });
    expect(wrapper.find('.collapsible__header').attributes('aria-expanded')).toBe('true');
    expect(wrapper.find('.collapsible__body').attributes('data-open')).toBe('true');
  });

  it('starts collapsed when defaultOpen is false', () => {
    const wrapper = mount(CollapsibleSection, {
      props: { title: 'Closed', defaultOpen: false },
    });
    expect(wrapper.find('.collapsible__header').attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('.collapsible__body').attributes('data-open')).toBeUndefined();
  });

  it('toggles on header click and emits toggle', async () => {
    const wrapper = mount(CollapsibleSection, {
      props: { title: 'Toggle Me' },
    });

    await wrapper.find('.collapsible__header').trigger('click');
    expect(wrapper.find('.collapsible__header').attributes('aria-expanded')).toBe('false');
    expect(wrapper.emitted('toggle')).toEqual([[false]]);

    await wrapper.find('.collapsible__header').trigger('click');
    expect(wrapper.find('.collapsible__header').attributes('aria-expanded')).toBe('true');
    expect(wrapper.emitted('toggle')).toEqual([[false], [true]]);
  });

  it('renders slot content', () => {
    const wrapper = mount(CollapsibleSection, {
      props: { title: 'Slot Test' },
      slots: { default: '<p class="inner">Hello from slot</p>' },
    });
    expect(wrapper.find('.inner').text()).toBe('Hello from slot');
  });

  it('syncs with defaultOpen prop changes', async () => {
    const wrapper = mount(CollapsibleSection, {
      props: { title: 'Sync', defaultOpen: true },
    });
    expect(wrapper.find('.collapsible__header').attributes('aria-expanded')).toBe('true');

    await wrapper.setProps({ defaultOpen: false });
    expect(wrapper.find('.collapsible__header').attributes('aria-expanded')).toBe('false');
  });

  it('has button type on header for accessibility', () => {
    const wrapper = mount(CollapsibleSection, {
      props: { title: 'A11y' },
    });
    expect(wrapper.find('.collapsible__header').attributes('type')).toBe('button');
  });
});
