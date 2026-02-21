<template>
  <div
    class="progress-bar"
    role="progressbar"
    :aria-valuenow="value"
    :aria-valuemin="0"
    :aria-valuemax="max"
    :aria-label="ariaLabel"
  >
    <div class="progress-bar__track">
      <div class="progress-bar__fill" :style="{ width: percentage + '%' }"></div>
    </div>
    <div v-if="showLabel" class="progress-bar__label">
      {{ labelText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    value: number;
    max?: number;
    showLabel?: boolean;
    label?: string;
  }>(),
  {
    max: 100,
    showLabel: false,
    label: '',
  },
);

const percentage = computed(() => {
  if (props.max <= 0) return 0;
  const ratio = props.value / props.max;
  return Math.min(100, Math.max(0, Math.round(ratio * 100)));
});

const labelText = computed(() => {
  if (props.label) return props.label;
  return `${percentage.value}%`;
});

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const ariaLabel = computed(() => {
  if (props.label) return props.label;
  if (props.showLabel) return labelText.value;
  return `Progress: ${percentage.value}%`;
});
</script>

<style scoped>
.progress-bar {
  display: grid;
  gap: var(--fp-space-1-5);
}

.progress-bar__track {
  height: 10px;
  border-radius: var(--fp-radius-full);
  background: rgba(148, 163, 184, 0.25);
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, #22d3ee, #3b82f6);
  transition: width 200ms ease;
}

.progress-bar__label {
  font-size: 12px;
  color: var(--fp-text-muted);
}
</style>
