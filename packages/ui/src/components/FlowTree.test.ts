import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { FlowTreeItem } from './FlowTree.vue';
import FlowTree from './FlowTree.vue';

const items: FlowTreeItem[] = [
  { id: 'n1', label: 'HTTP In', category: 'input' },
  { id: 'n2', label: 'Transform', category: 'logic' },
  { id: 'n3', label: 'HTTP Out', category: 'output' },
];

describe('FlowTree', () => {
  it('renders item count in header', () => {
    const wrapper = mount(FlowTree, { props: { items } });
    expect(wrapper.find('.flow-tree__count').text()).toBe('3 nodes');
  });

  it('renders all items as list entries', () => {
    const wrapper = mount(FlowTree, { props: { items } });
    const listItems = wrapper.findAll('.flow-tree__item');
    expect(listItems).toHaveLength(3);
  });

  it('displays item labels', () => {
    const wrapper = mount(FlowTree, { props: { items } });
    const labels = wrapper.findAll('.flow-tree__label');
    expect(labels[0].text()).toBe('HTTP In');
    expect(labels[1].text()).toBe('Transform');
    expect(labels[2].text()).toBe('HTTP Out');
  });

  it('sets data-category on dot elements', () => {
    const wrapper = mount(FlowTree, { props: { items } });
    const dots = wrapper.findAll('.flow-tree__dot');
    expect(dots[0].attributes('data-category')).toBe('input');
    expect(dots[1].attributes('data-category')).toBe('logic');
    expect(dots[2].attributes('data-category')).toBe('output');
  });

  it('defaults category to logic when not specified', () => {
    const wrapper = mount(FlowTree, {
      props: { items: [{ id: 'x', label: 'No cat' }] },
    });
    expect(wrapper.find('.flow-tree__dot').attributes('data-category')).toBe('logic');
  });

  it('emits select with item id on click', async () => {
    const wrapper = mount(FlowTree, { props: { items } });
    await wrapper.findAll('.flow-tree__button')[1].trigger('click');
    expect(wrapper.emitted('select')).toEqual([['n2']]);
  });

  it('hides exclude buttons by default', () => {
    const wrapper = mount(FlowTree, { props: { items } });
    expect(wrapper.find('.flow-tree__exclude').exists()).toBe(false);
  });

  it('shows exclude buttons when allowExclude is true', () => {
    const wrapper = mount(FlowTree, {
      props: { items, allowExclude: true },
    });
    const excludeButtons = wrapper.findAll('.flow-tree__exclude');
    expect(excludeButtons).toHaveLength(3);
    expect(excludeButtons[0].text()).toBe('Exclude');
  });

  it('shows Include text for excluded items', () => {
    const wrapper = mount(FlowTree, {
      props: { items, allowExclude: true, excludedIds: new Set(['n1']) },
    });
    const excludeButtons = wrapper.findAll('.flow-tree__exclude');
    expect(excludeButtons[0].text()).toBe('Include');
    expect(excludeButtons[1].text()).toBe('Exclude');
  });

  it('sets aria-pressed on exclude buttons for excluded items', () => {
    const wrapper = mount(FlowTree, {
      props: { items, allowExclude: true, excludedIds: new Set(['n2']) },
    });
    const excludeButtons = wrapper.findAll('.flow-tree__exclude');
    expect(excludeButtons[1].attributes('aria-pressed')).toBe('true');
    expect(excludeButtons[0].attributes('aria-pressed')).toBe('false');
  });

  it('emits exclude with item id on exclude button click', async () => {
    const wrapper = mount(FlowTree, {
      props: { items, allowExclude: true },
    });
    await wrapper.findAll('.flow-tree__exclude')[2].trigger('click');
    expect(wrapper.emitted('exclude')).toEqual([['n3']]);
  });

  it('handles ArrowDown keydown to focus next item', async () => {
    const wrapper = mount(FlowTree, {
      props: { items },
      attachTo: document.body,
    });
    const buttons = wrapper.findAll('.flow-tree__button');
    await buttons[0].trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement).toBe(buttons[1].element);
    wrapper.unmount();
  });

  it('handles ArrowUp keydown to focus previous item', async () => {
    const wrapper = mount(FlowTree, {
      props: { items },
      attachTo: document.body,
    });
    const buttons = wrapper.findAll('.flow-tree__button');
    (buttons[2].element as HTMLElement).focus();
    await buttons[2].trigger('keydown', { key: 'ArrowUp' });
    expect(document.activeElement).toBe(buttons[1].element);
    wrapper.unmount();
  });

  it('handles Home key to focus first item', async () => {
    const wrapper = mount(FlowTree, {
      props: { items },
      attachTo: document.body,
    });
    const buttons = wrapper.findAll('.flow-tree__button');
    await buttons[2].trigger('keydown', { key: 'Home' });
    expect(document.activeElement).toBe(buttons[0].element);
    wrapper.unmount();
  });

  it('handles End key to focus last item', async () => {
    const wrapper = mount(FlowTree, {
      props: { items },
      attachTo: document.body,
    });
    const buttons = wrapper.findAll('.flow-tree__button');
    await buttons[0].trigger('keydown', { key: 'End' });
    expect(document.activeElement).toBe(buttons[2].element);
    wrapper.unmount();
  });

  it('clamps ArrowDown at last item', async () => {
    const wrapper = mount(FlowTree, {
      props: { items },
      attachTo: document.body,
    });
    const buttons = wrapper.findAll('.flow-tree__button');
    await buttons[2].trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement).toBe(buttons[2].element);
    wrapper.unmount();
  });

  it('renders empty list without errors', () => {
    const wrapper = mount(FlowTree, { props: { items: [] } });
    expect(wrapper.find('.flow-tree__count').text()).toBe('0 nodes');
    expect(wrapper.findAll('.flow-tree__item')).toHaveLength(0);
  });
});
