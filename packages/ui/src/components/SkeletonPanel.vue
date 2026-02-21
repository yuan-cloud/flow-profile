<template>
  <section
    class="skeleton-panel"
    role="status"
    :aria-label="label"
  >
    <SkeletonBlock width="40%" height="0.75rem" />
    <SkeletonBlock width="70%" height="1.25rem" />
    <div class="skeleton-panel__body">
      <SkeletonBlock v-for="n in lines" :key="n" :width="lineWidth(n)" height="0.875rem" />
    </div>
  </section>
</template>

<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template.
import SkeletonBlock from './SkeletonBlock.vue';

withDefaults(
  defineProps<{
    lines?: number;
    label?: string;
  }>(),
  {
    lines: 4,
    label: 'Loading content...',
  },
);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const lineWidth = (n: number) => {
  const widths = ['100%', '85%', '92%', '70%', '88%', '75%'];
  return widths[(n - 1) % widths.length];
};
</script>

<style scoped>
.skeleton-panel {
  display: grid;
  gap: var(--fp-space-3);
  padding: var(--fp-space-5);
  border-radius: var(--fp-radius-3xl);
  border: 1px solid rgba(148, 163, 184, 0.15);
  background: rgba(15, 23, 42, 0.5);
}

.skeleton-panel__body {
  display: grid;
  gap: var(--fp-space-2);
  margin-top: var(--fp-space-2);
}
</style>
