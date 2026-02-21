<template>
  <hr :class="dividerClasses" :aria-orientation="orientation" />
</template>

<script setup lang="ts">
/**
 * FpDivider - Flow Profile Divider Component
 *
 * A visual separator between content sections.
 *
 * Usage:
 *   <FpDivider />
 *   <FpDivider orientation="vertical" />
 *   <FpDivider variant="strong" spacing="lg" />
 */

import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Orientation */
    orientation?: 'horizontal' | 'vertical';
    /** Visual variant */
    variant?: 'subtle' | 'default' | 'strong';
    /** Spacing around divider */
    spacing?: 'none' | 'sm' | 'md' | 'lg';
  }>(),
  {
    orientation: 'horizontal',
    variant: 'default',
    spacing: 'none',
  },
);

const variantMap = {
  subtle: 'border-fp-border-subtle',
  default: 'border-fp-border-default',
  strong: 'border-fp-border-strong',
};

const spacingMap = {
  none: '',
  sm: props.orientation === 'horizontal' ? 'my-2' : 'mx-2',
  md: props.orientation === 'horizontal' ? 'my-4' : 'mx-4',
  lg: props.orientation === 'horizontal' ? 'my-6' : 'mx-6',
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const dividerClasses = computed(() => [
  'border-0',
  props.orientation === 'horizontal' ? 'w-full border-t' : 'h-full border-l self-stretch',
  variantMap[props.variant],
  spacingMap[props.spacing],
]);
</script>
