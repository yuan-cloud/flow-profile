<template>
  <div class="diff-viewer">
    <div class="diff-viewer__column">
      <p class="diff-viewer__label">Before</p>
      <pre class="diff-viewer__content">{{ before }}</pre>
    </div>
    <div class="diff-viewer__column">
      <p class="diff-viewer__label">After</p>
      <pre class="diff-viewer__content">{{ after }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  before: string;
  after: string;
}>();
</script>

<style scoped>
.diff-viewer {
  display: grid;
  gap: var(--fp-space-3);
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.diff-viewer__column {
  padding: var(--fp-space-3-5);
  border-radius: var(--fp-radius-xl);
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
}

.diff-viewer__label {
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--fp-text-muted);
}

.diff-viewer__content {
  margin-top: var(--fp-space-2);
  white-space: pre-wrap;
  font-size: 12px;
}
</style>
