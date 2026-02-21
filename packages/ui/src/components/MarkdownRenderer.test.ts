import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import MarkdownRenderer from './MarkdownRenderer.vue';

describe('MarkdownRenderer', () => {
  it('renders markdown headings as HTML', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { content: '# Hello World' },
    });
    const html = wrapper.find('.markdown-renderer__content').html();
    expect(html).toContain('<h1');
    expect(html).toContain('Hello World');
  });

  it('renders paragraphs', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { content: 'A paragraph of text.' },
    });
    const html = wrapper.find('.markdown-renderer__content').html();
    expect(html).toContain('<p');
    expect(html).toContain('A paragraph of text.');
  });

  it('renders inline code', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { content: 'Use `console.log` for debugging' },
    });
    const html = wrapper.find('.markdown-renderer__content').html();
    expect(html).toContain('<code');
    expect(html).toContain('console.log');
  });

  it('renders fenced code blocks', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { content: '```\nconst x = 1;\n```' },
    });
    const html = wrapper.find('.markdown-renderer__content').html();
    expect(html).toContain('const x = 1;');
  });

  it('renders GFM lists', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { content: '- Item 1\n- Item 2\n- Item 3' },
    });
    const html = wrapper.find('.markdown-renderer__content').html();
    expect(html).toContain('<ul');
    expect(html).toContain('<li');
    expect(html).toContain('Item 1');
  });

  it('renders bold and italic', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { content: '**bold** and *italic*' },
    });
    const html = wrapper.find('.markdown-renderer__content').html();
    expect(html).toContain('<strong');
    expect(html).toContain('<em');
  });

  it('handles empty content', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { content: '' },
    });
    expect(wrapper.find('.markdown-renderer__content').exists()).toBe(true);
  });

  it('renders links', () => {
    const wrapper = mount(MarkdownRenderer, {
      props: { content: '[Click here](https://example.com)' },
    });
    const html = wrapper.find('.markdown-renderer__content').html();
    expect(html).toContain('<a');
    expect(html).toContain('https://example.com');
    expect(html).toContain('Click here');
  });
});
