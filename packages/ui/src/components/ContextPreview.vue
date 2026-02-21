<template>
  <section class="context-preview">
    <header class="context-preview__header">
      <div>
        <p class="context-preview__label">Context Preview</p>
        <p class="context-preview__subtitle">What the assistant will see</p>
      </div>
      <div class="context-preview__actions">
        <button
          class="context-preview__toggle"
          type="button"
          :aria-pressed="isDiff"
          @click="toggleDiff"
        >
          {{ isDiff ? 'Diff on' : 'Diff off' }}
        </button>
        <button class="context-preview__copy" type="button" @click="handleCopy">
          {{ copyLabel }}
        </button>
      </div>
    </header>

    <div ref="scrollRef" class="context-preview__body">
      <div v-if="isDiff && hasPrevious" class="context-preview__diff">
        <div class="context-preview__diff-column">
          <p class="context-preview__diff-label">Removed</p>
          <pre class="context-preview__diff-content">
<span v-for="(line, index) in diffLines.removed" :key="`rm-${index}`" class="diff-line diff-line--remove">- {{ line }}</span>
          </pre>
        </div>
        <div class="context-preview__diff-column">
          <p class="context-preview__diff-label">Added</p>
          <pre class="context-preview__diff-content">
<span v-for="(line, index) in diffLines.added" :key="`add-${index}`" class="diff-line diff-line--add">+ {{ line }}</span>
          </pre>
        </div>
      </div>
      <div v-else class="context-preview__markdown">
        <MarkdownRenderer :content="content" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useClipboard } from '../composables/useClipboard';
// biome-ignore lint/correctness/noUnusedImports: used in template.
import MarkdownRenderer from './MarkdownRenderer.vue';

const props = withDefaults(
  defineProps<{
    content: string;
    previousContent?: string | null;
    showDiff?: boolean;
  }>(),
  {
    previousContent: null,
    showDiff: false,
  },
);

const emit = defineEmits<{
  'update:showDiff': [boolean];
  copy: [string];
}>();

const scrollRef = ref<HTMLElement | null>(null);
const { copy, reset, status } = useClipboard();

const isDiff = computed({
  get: () => props.showDiff,
  set: (value) => emit('update:showDiff', value),
});

const hasPrevious = computed(
  () => !!props.previousContent && props.previousContent !== props.content,
);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const copyLabel = computed(() => {
  if (status.value === 'success') return 'Copied';
  if (status.value === 'error') return 'Copy failed';
  return 'Copy';
});

const splitLines = (input: string) => input.split(/\r?\n/);

const countLines = (lines: string[]) => {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const next = (counts.get(line) ?? 0) + 1;
    counts.set(line, next);
  }
  return counts;
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const diffLines = computed(() => {
  if (!hasPrevious.value) {
    return { removed: [], added: [] };
  }
  const beforeLines = splitLines(props.previousContent ?? '');
  const afterLines = splitLines(props.content ?? '');
  const afterCounts = countLines(afterLines);
  const beforeCounts = countLines(beforeLines);

  const removed: string[] = [];
  const added: string[] = [];

  for (const line of beforeLines) {
    const remaining = afterCounts.get(line) ?? 0;
    if (remaining > 0) {
      afterCounts.set(line, remaining - 1);
    } else {
      removed.push(line);
    }
  }

  for (const line of afterLines) {
    const remaining = beforeCounts.get(line) ?? 0;
    if (remaining > 0) {
      beforeCounts.set(line, remaining - 1);
    } else {
      added.push(line);
    }
  }

  return { removed, added };
});

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleCopy = async () => {
  await copy(props.content ?? '');
  emit('copy', props.content ?? '');
  window.setTimeout(() => reset(), 1500);
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const toggleDiff = () => {
  isDiff.value = !isDiff.value;
};

const preserveScroll = async () => {
  const node = scrollRef.value;
  if (!node) return;
  const { scrollTop } = node;
  await nextTick();
  node.scrollTop = scrollTop;
};

watch(
  () => [props.content, props.previousContent, props.showDiff],
  () => {
    preserveScroll();
  },
);
</script>

<style scoped>
.context-preview {
  display: grid;
  gap: var(--fp-space-4);
  padding: var(--fp-space-4);
  border-radius: var(--fp-radius-2xl);
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
}

.context-preview__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--fp-space-3);
}

.context-preview__label {
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--fp-text-muted);
}

.context-preview__subtitle {
  margin-top: var(--fp-space-1-5);
  font-size: 14px;
  color: var(--fp-text-secondary);
}

.context-preview__actions {
  display: flex;
  gap: var(--fp-space-2);
  align-items: center;
}

.context-preview__toggle,
.context-preview__copy {
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: transparent;
  color: inherit;
  border-radius: var(--fp-radius-xl);
  padding: var(--fp-space-1-5) var(--fp-space-3);
  font-size: 12px;
  cursor: pointer;
}

.context-preview__toggle[aria-pressed='true'] {
  border-color: rgba(56, 189, 248, 0.7);
  color: #38bdf8;
}

.context-preview__body {
  max-height: 520px;
  overflow: auto;
  border-radius: var(--fp-radius-xl);
}

.context-preview__diff {
  display: grid;
  gap: var(--fp-space-3);
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.context-preview__diff-column {
  border-radius: var(--fp-radius-xl);
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(10, 15, 30, 0.65);
  padding: var(--fp-space-3);
}

.context-preview__diff-label {
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--fp-text-muted);
}

.context-preview__diff-content {
  margin-top: var(--fp-space-2-5);
  white-space: pre-wrap;
  font-family: 'JetBrains Mono', 'SFMono-Regular', ui-monospace, SFMono-Regular, monospace;
  font-size: 12px;
  display: grid;
  gap: var(--fp-space-1);
}

.diff-line {
  display: block;
  padding: var(--fp-space-0-5) var(--fp-space-1-5);
  border-radius: var(--fp-radius-lg);
}

.diff-line--remove {
  background: rgba(248, 113, 113, 0.16);
  color: #fecaca;
}

.diff-line--add {
  background: rgba(52, 211, 153, 0.16);
  color: #bbf7d0;
}

.context-preview__markdown :deep(.markdown-renderer) {
  border: none;
  background: transparent;
  padding: 0;
}
</style>
