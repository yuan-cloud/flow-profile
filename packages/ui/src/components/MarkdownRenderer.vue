<template>
  <div class="markdown-renderer">
    <div class="markdown-renderer__content" v-html="renderedHtml"></div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked';
import Prism from 'prismjs';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import { computed } from 'vue';

const props = defineProps<{
  content: string;
}>();

let isMarkedConfigured = false;

const configureMarked = () => {
  if (isMarkedConfigured) return;
  isMarkedConfigured = true;

  const renderer = new marked.Renderer();
  renderer.code = (code, language) => {
    const token =
      typeof code === 'object' && code !== null ? (code as { text?: string; lang?: string }) : null;
    const rawCode = token?.text ?? code;
    const rawLang = token?.lang ?? language;
    const lang = (rawLang ?? '').toLowerCase();
    const grammar = Prism.languages[lang] ?? Prism.languages.markup;
    const highlighted = Prism.highlight(String(rawCode ?? ''), grammar, lang || 'markup');
    return `<pre class="markdown-renderer__code language-${lang || 'markup'}"><code class="language-${lang || 'markup'}">${highlighted}</code></pre>`;
  };

  marked.setOptions({
    gfm: true,
    breaks: false,
    mangle: false,
    headerIds: false,
    renderer,
  });
};

configureMarked();

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const renderedHtml = computed(() => marked.parse(props.content ?? ''));
</script>

<style scoped>
.markdown-renderer {
  padding: var(--fp-space-4);
  border-radius: var(--fp-radius-2xl);
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
}

.markdown-renderer__content {
  margin: 0;
  white-space: normal;
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.6;
}

.markdown-renderer__content :deep(h1),
.markdown-renderer__content :deep(h2),
.markdown-renderer__content :deep(h3) {
  margin: var(--fp-space-4) 0 var(--fp-space-2);
  font-weight: 600;
}

.markdown-renderer__content :deep(p),
.markdown-renderer__content :deep(ul),
.markdown-renderer__content :deep(ol) {
  margin: var(--fp-space-2-5) 0;
}

.markdown-renderer__content :deep(code) {
  font-family: 'JetBrains Mono', 'SFMono-Regular', ui-monospace, SFMono-Regular, monospace;
  background: rgba(15, 23, 42, 0.6);
  padding: var(--fp-space-0-5) var(--fp-space-1-5);
  border-radius: var(--fp-radius-lg);
  color: #93c5fd;
}

.markdown-renderer__content :deep(pre) {
  margin: var(--fp-space-3) 0;
  padding: var(--fp-space-3) var(--fp-space-3-5);
  border-radius: var(--fp-radius-xl);
  background: rgba(15, 23, 42, 0.8);
  overflow-x: auto;
}

.markdown-renderer__content :deep(pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
}

.markdown-renderer__content :deep(.token.comment),
.markdown-renderer__content :deep(.token.prolog),
.markdown-renderer__content :deep(.token.doctype),
.markdown-renderer__content :deep(.token.cdata) {
  color: #64748b;
}

.markdown-renderer__content :deep(.token.punctuation) {
  color: #cbd5f5;
}

.markdown-renderer__content :deep(.token.property),
.markdown-renderer__content :deep(.token.tag),
.markdown-renderer__content :deep(.token.boolean),
.markdown-renderer__content :deep(.token.number),
.markdown-renderer__content :deep(.token.constant),
.markdown-renderer__content :deep(.token.symbol) {
  color: #fbbf24;
}

.markdown-renderer__content :deep(.token.selector),
.markdown-renderer__content :deep(.token.attr-name),
.markdown-renderer__content :deep(.token.string),
.markdown-renderer__content :deep(.token.char),
.markdown-renderer__content :deep(.token.builtin),
.markdown-renderer__content :deep(.token.inserted) {
  color: #34d399;
}

.markdown-renderer__content :deep(.token.operator),
.markdown-renderer__content :deep(.token.entity),
.markdown-renderer__content :deep(.token.url),
.markdown-renderer__content :deep(.token.variable) {
  color: #38bdf8;
}

.markdown-renderer__content :deep(.token.atrule),
.markdown-renderer__content :deep(.token.attr-value),
.markdown-renderer__content :deep(.token.keyword) {
  color: #60a5fa;
}

.markdown-renderer__content :deep(.token.function),
.markdown-renderer__content :deep(.token.class-name) {
  color: #f472b6;
}

.markdown-renderer__content :deep(.token.regex),
.markdown-renderer__content :deep(.token.important) {
  color: #fb7185;
}
</style>
