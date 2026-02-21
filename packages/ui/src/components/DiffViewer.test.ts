import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import DiffViewer from './DiffViewer.vue';

describe('DiffViewer', () => {
  it('renders before and after content in separate columns', () => {
    const wrapper = mount(DiffViewer, {
      props: { before: 'old text', after: 'new text' },
    });
    const columns = wrapper.findAll('.diff-viewer__column');
    expect(columns).toHaveLength(2);
    expect(columns[0].find('.diff-viewer__label').text()).toBe('Before');
    expect(columns[1].find('.diff-viewer__label').text()).toBe('After');
  });

  it('displays before content in first pre element', () => {
    const wrapper = mount(DiffViewer, {
      props: { before: 'line 1\nline 2', after: 'changed' },
    });
    const pres = wrapper.findAll('.diff-viewer__content');
    expect(pres[0].text()).toBe('line 1\nline 2');
  });

  it('displays after content in second pre element', () => {
    const wrapper = mount(DiffViewer, {
      props: { before: 'original', after: 'modified\ncontent' },
    });
    const pres = wrapper.findAll('.diff-viewer__content');
    expect(pres[1].text()).toBe('modified\ncontent');
  });

  it('handles empty strings', () => {
    const wrapper = mount(DiffViewer, {
      props: { before: '', after: '' },
    });
    const pres = wrapper.findAll('.diff-viewer__content');
    expect(pres[0].text()).toBe('');
    expect(pres[1].text()).toBe('');
  });
});
