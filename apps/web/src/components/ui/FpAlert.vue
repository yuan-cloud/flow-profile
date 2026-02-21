<template>
  <div :class="alertClasses" role="alert">
    <!-- Icon -->
    <FpIcon :name="iconName" :size="iconSize" :class="iconClasses" decorative />

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p v-if="title" :class="titleClasses">{{ title }}</p>
      <div :class="contentClasses">
        <slot />
      </div>
    </div>

    <!-- Dismiss button -->
    <button
      v-if="dismissible"
      type="button"
      class="shrink-0 p-1 rounded-fp-md text-current opacity-60 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
      @click="emit('dismiss')"
    >
      <FpIcon name="X" size="sm" label="Dismiss" :decorative="false" />
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * FpAlert - Flow Profile Alert Component
 *
 * Displays feedback messages with semantic styling.
 *
 * Variants:
 *   - info: Neutral information
 *   - success: Positive feedback
 *   - warning: Cautionary message
 *   - error: Error or failure
 *
 * Usage:
 *   <FpAlert variant="success" title="Saved!">Your changes have been saved.</FpAlert>
 *   <FpAlert variant="error" dismissible @dismiss="hideError">Something went wrong.</FpAlert>
 */

import { computed } from 'vue';
// biome-ignore lint/correctness/noUnusedImports: used in template.
import { FpIcon, ICONS } from '@/components/icons';

const props = withDefaults(
  defineProps<{
    /** Alert variant */
    variant?: 'info' | 'success' | 'warning' | 'error';
    /** Alert title */
    title?: string;
    /** Size */
    size?: 'sm' | 'md';
    /** Show dismiss button */
    dismissible?: boolean;
  }>(),
  {
    variant: 'info',
    size: 'md',
    dismissible: false,
  },
);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const emit = defineEmits<{
  dismiss: [];
}>();

// Icon mapping
const iconMap = {
  info: ICONS.INFO,
  success: ICONS.SUCCESS,
  warning: ICONS.WARNING,
  error: ICONS.ERROR,
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const iconName = computed(() => iconMap[props.variant]);
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const iconSize = computed(() => (props.size === 'sm' ? 'sm' : 'md'));

// Alert classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const alertClasses = computed(() => {
  const variantClasses = {
    info: 'bg-fp-info-bg border-fp-info-border text-fp-info-text',
    success: 'bg-fp-success-bg border-fp-success-border text-fp-success-text',
    warning: 'bg-fp-warning-bg border-fp-warning-border text-fp-warning-text',
    error: 'bg-fp-error-bg border-fp-error-border text-fp-error-text',
  };

  const sizeClasses = {
    sm: 'p-2 gap-2 text-xs',
    md: 'p-3 gap-3 text-sm',
  };

  return [
    'flex items-start rounded-fp-lg border',
    variantClasses[props.variant],
    sizeClasses[props.size],
  ];
});

// Icon classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const iconClasses = computed(() => ['shrink-0 mt-0.5']);

// Title classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const titleClasses = computed(() => ['font-medium']);

// Content classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const contentClasses = computed(() => [props.title && 'mt-1', 'opacity-90']);
</script>
