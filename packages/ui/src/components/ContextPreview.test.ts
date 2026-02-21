import { shallowMount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../composables/useClipboard', () => ({
  useClipboard: () => ({
    copy: vi.fn().mockResolvedValue(true),
    reset: vi.fn(),
    status: { value: 'idle' },
  }),
}));

import ContextPreview from './ContextPreview.vue';

describe('ContextPreview', () => {
  it('renders content label and subtitle', () => {
    const wrapper = shallowMount(ContextPreview, {
      props: { content: 'Hello' },
    });
    expect(wrapper.find('.context-preview__label').text()).toBe('Context Preview');
    expect(wrapper.find('.context-preview__subtitle').text()).toBe('What the assistant will see');
  });

  it('shows Diff off button by default', () => {
    const wrapper = shallowMount(ContextPreview, {
      props: { content: 'Content here' },
    });
    expect(wrapper.find('.context-preview__toggle').text()).toBe('Diff off');
    expect(wrapper.find('.context-preview__toggle').attributes('aria-pressed')).toBe('false');
  });

  it('shows Diff on when showDiff is true with previous content', () => {
    const wrapper = shallowMount(ContextPreview, {
      props: { content: 'New', previousContent: 'Old', showDiff: true },
    });
    expect(wrapper.find('.context-preview__toggle').text()).toBe('Diff on');
    expect(wrapper.find('.context-preview__toggle').attributes('aria-pressed')).toBe('true');
  });

  it('emits update:showDiff on toggle click', async () => {
    const wrapper = shallowMount(ContextPreview, {
      props: { content: 'Test' },
    });
    await wrapper.find('.context-preview__toggle').trigger('click');
    expect(wrapper.emitted('update:showDiff')).toEqual([[true]]);
  });

  it('emits copy event on copy button click', async () => {
    const wrapper = shallowMount(ContextPreview, {
      props: { content: 'Copy me' },
    });
    await wrapper.find('.context-preview__copy').trigger('click');
    expect(wrapper.emitted('copy')).toEqual([['Copy me']]);
  });

  it('shows diff view with removed and added lines', () => {
    const wrapper = shallowMount(ContextPreview, {
      props: {
        content: 'line1\nline3\nline4',
        previousContent: 'line1\nline2\nline3',
        showDiff: true,
      },
    });
    const removedLines = wrapper.findAll('.diff-line--remove');
    const addedLines = wrapper.findAll('.diff-line--add');
    expect(removedLines.length).toBeGreaterThan(0);
    expect(addedLines.length).toBeGreaterThan(0);
    expect(removedLines.map((el) => el.text())).toContain('- line2');
    expect(addedLines.map((el) => el.text())).toContain('+ line4');
  });

  it('shows markdown view when diff is off', () => {
    const wrapper = shallowMount(ContextPreview, {
      props: { content: '# Hello', previousContent: 'Old', showDiff: false },
    });
    expect(wrapper.find('.context-preview__markdown').exists()).toBe(true);
    expect(wrapper.find('.context-preview__diff').exists()).toBe(false);
  });

  it('shows markdown view when no previous content', () => {
    const wrapper = shallowMount(ContextPreview, {
      props: { content: 'Current', showDiff: true },
    });
    expect(wrapper.find('.context-preview__markdown').exists()).toBe(true);
  });

  it('shows markdown view when previous equals current', () => {
    const wrapper = shallowMount(ContextPreview, {
      props: { content: 'Same', previousContent: 'Same', showDiff: true },
    });
    expect(wrapper.find('.context-preview__markdown').exists()).toBe(true);
  });

  it('handles empty diff correctly', () => {
    const wrapper = shallowMount(ContextPreview, {
      props: { content: 'A\nB', previousContent: 'A\nB\nC', showDiff: true },
    });
    const removed = wrapper.findAll('.diff-line--remove');
    expect(removed.map((el) => el.text())).toContain('- C');
  });
});
