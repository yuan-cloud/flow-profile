<template>
  <article class="risk-card" :data-severity="severity">
    <header class="risk-card__header">
      <p class="risk-card__title">{{ title }}</p>
      <span class="risk-card__severity">{{ severityLabel }}</span>
    </header>
    <p class="risk-card__description">{{ description }}</p>
    <button v-if="nodeId" class="risk-card__action" type="button" @click="handleSelect">
      View node
    </button>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    title: string;
    description: string;
    severity?: 'low' | 'medium' | 'high';
    nodeId?: string | null;
  }>(),
  {
    severity: 'low',
    nodeId: null,
  },
);

const emit = defineEmits<{
  select: [string];
}>();

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const severityLabel = computed(() => props.severity.toUpperCase());

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleSelect = () => {
  if (!props.nodeId) return;
  emit('select', props.nodeId);
};
</script>

<style scoped>
.risk-card {
  display: grid;
  gap: var(--fp-space-2-5);
  padding: var(--fp-space-3-5) var(--fp-space-4);
  border-radius: var(--fp-radius-xl);
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
}

.risk-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--fp-space-2);
}

.risk-card__title {
  font-weight: 600;
}

.risk-card__severity {
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  padding: var(--fp-space-1) var(--fp-space-1-5);
  border-radius: var(--fp-radius-full);
  border: 1px solid rgba(148, 163, 184, 0.4);
}

.risk-card[data-severity='high'] .risk-card__severity {
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.6);
}

.risk-card[data-severity='medium'] .risk-card__severity {
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.6);
}

.risk-card__description {
  font-size: 13px;
  color: var(--fp-text-secondary);
}

.risk-card__action {
  align-self: start;
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.4);
  color: inherit;
  padding: var(--fp-space-1-5) var(--fp-space-2-5);
  border-radius: var(--fp-radius-lg);
  font-size: 12px;
  cursor: pointer;
}
</style>
