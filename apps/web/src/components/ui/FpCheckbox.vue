<template>
  <label :class="wrapperClasses">
    <!-- Checkbox input -->
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      :indeterminate="indeterminate"
      :class="checkboxClasses"
      @change="handleChange"
    />

    <!-- Label text -->
    <span v-if="label || $slots.default" :class="labelClasses">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<script setup lang="ts">
/**
 * FpCheckbox - Flow Profile Checkbox Component
 *
 * A checkbox input with label support.
 *
 * Usage:
 *   <FpCheckbox v-model="agreed" label="I agree to the terms" />
 *   <FpCheckbox v-model="selected" :indeterminate="isPartial" />
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
    /** Indeterminate state */
    indeterminate?: boolean;
  }>(),
  {
    modelValue: false,
    size: 'md',
    disabled: false,
    indeterminate: false,
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

// Size mappings
const checkboxSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

// Wrapper classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const wrapperClasses = computed(() => [
  'inline-flex items-center gap-2 cursor-pointer',
  props.disabled && 'cursor-not-allowed opacity-50',
]);

// Checkbox classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const checkboxClasses = computed(() => [
  // Base
  'shrink-0 rounded-fp-sm border-2 appearance-none cursor-pointer',
  'transition-colors duration-fp-fast',
  // Size
  checkboxSizes[props.size],
  // Default state
  'border-fp-border-strong bg-fp-surface-sunken',
  // Checked state
  'checked:bg-fp-accent-primary checked:border-fp-accent-primary',
  // Checked indicator (via pseudo-element in global CSS)
  "checked:bg-[url(\"data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E\")]",
  'checked:bg-center checked:bg-no-repeat',
  // Focus ring
  'focus:outline-none focus:ring-2 focus:ring-fp-border-focus focus:ring-offset-2 focus:ring-offset-fp-surface-base',
  // Disabled
  'disabled:cursor-not-allowed',
]);

// Label classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const labelClasses = computed(() => ['text-sm text-fp-text-secondary select-none']);
</script>
