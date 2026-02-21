<template>
  <label :class="wrapperClasses">
    <!-- Hidden checkbox for accessibility -->
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      class="sr-only peer"
      @change="handleChange"
    />

    <!-- Toggle track -->
    <span :class="trackClasses">
      <!-- Toggle thumb -->
      <span :class="thumbClasses" />
    </span>

    <!-- Label text -->
    <span v-if="label" :class="labelClasses">
      {{ label }}
    </span>
  </label>
</template>

<script setup lang="ts">
/**
 * FpToggle - Flow Profile Toggle/Switch Component
 *
 * A boolean toggle switch for on/off states.
 *
 * Usage:
 *   <FpToggle v-model="darkMode" label="Dark mode" />
 *   <FpToggle v-model="notifications" size="sm" />
 */

import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** v-model binding */
    modelValue?: boolean;
    /** Label text */
    label?: string;
    /** Size preset */
    size?: 'sm' | 'md' | 'lg';
    /** Disabled state */
    disabled?: boolean;
  }>(),
  {
    modelValue: false,
    size: 'md',
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.checked);
};

// Wrapper classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const wrapperClasses = computed(() => [
  'inline-flex items-center gap-3 cursor-pointer',
  props.disabled && 'cursor-not-allowed opacity-50',
]);

// Track dimensions by size
const trackSizes = {
  sm: 'w-8 h-4',
  md: 'w-10 h-5',
  lg: 'w-12 h-6',
};

// Thumb dimensions by size
const thumbSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

// Thumb translation by size
const thumbTranslate = {
  sm: 'peer-checked:translate-x-4',
  md: 'peer-checked:translate-x-5',
  lg: 'peer-checked:translate-x-6',
};

// Track classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const trackClasses = computed(() => [
  // Base
  'relative inline-flex shrink-0 rounded-fp-full',
  'transition-colors duration-fp-fast',
  // Size
  trackSizes[props.size],
  // Off state
  'bg-fp-surface-active',
  // On state (via peer)
  'peer-checked:bg-fp-accent-primary',
  // Focus ring
  'peer-focus:ring-2 peer-focus:ring-fp-border-focus peer-focus:ring-offset-2 peer-focus:ring-offset-fp-surface-base',
]);

// Thumb classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const thumbClasses = computed(() => [
  // Base
  'absolute top-0.5 left-0.5 rounded-fp-full bg-white shadow-sm',
  'transform transition-transform duration-fp-fast',
  // Size
  thumbSizes[props.size],
  // Translate when checked
  thumbTranslate[props.size],
]);

// Label classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const labelClasses = computed(() => ['text-sm text-fp-text-secondary', 'select-none']);
</script>
