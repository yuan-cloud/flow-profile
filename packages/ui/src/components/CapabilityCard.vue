<template>
  <article class="capability-card" :data-type="type">
    <header class="capability-card__header">
      <p class="capability-card__name">{{ name }}</p>
      <span class="capability-card__type">{{ typeLabel }}</span>
    </header>
    <p class="capability-card__description">{{ description }}</p>
    <div class="capability-card__meta">
      <span class="capability-card__confidence">{{ confidenceLabel }}</span>
      <button v-if="nodeId" class="capability-card__action" type="button" @click="handleSelect">
        View node
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    name: string;
    description: string;
    type: 'tool' | 'resource';
    confidence?: 'high' | 'medium' | 'low';
    nodeId?: string | null;
  }>(),
  {
    confidence: 'medium',
    nodeId: null,
  },
);

const emit = defineEmits<{
  select: [string];
}>();

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const typeLabel = computed(() => (props.type === 'tool' ? 'Tool' : 'Resource'));
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const confidenceLabel = computed(() => `Confidence: ${props.confidence}`);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleSelect = () => {
  if (!props.nodeId) return;
  emit('select', props.nodeId);
};
</script>

<style scoped>
.capability-card {
  display: grid;
  gap: var(--fp-space-2-5);
  padding: var(--fp-space-3-5) var(--fp-space-4);
  border-radius: var(--fp-radius-xl);
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
}

.capability-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--fp-space-2);
}

.capability-card__name {
  font-weight: 600;
}

.capability-card__type {
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  padding: var(--fp-space-1) var(--fp-space-1-5);
  border-radius: var(--fp-radius-full);
  border: 1px solid rgba(148, 163, 184, 0.4);
}

.capability-card[data-type='tool'] .capability-card__type {
  color: #22d3ee;
  border-color: rgba(34, 211, 238, 0.5);
}

.capability-card__description {
  font-size: 13px;
  color: var(--fp-text-secondary);
}

.capability-card__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--fp-space-2);
}

.capability-card__confidence {
  font-size: 12px;
  color: var(--fp-text-muted);
}

.capability-card__action {
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.4);
  color: inherit;
  padding: var(--fp-space-1-5) var(--fp-space-2-5);
  border-radius: var(--fp-radius-lg);
  font-size: 12px;
  cursor: pointer;
}
</style>
