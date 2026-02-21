<template>
  <component :is="as" :class="containerClasses">
    <slot />
  </component>
</template>

<script setup lang="ts">
/**
 * FpContainer - Flow Profile Container Component
 *
 * A centered, max-width constrained container.
 *
 * Usage:
 *   <FpContainer size="lg">
 *     Page content
 *   </FpContainer>
 */

import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** HTML element */
    as?: 'div' | 'main' | 'section' | 'article';
    /** Max width */
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    /** Padding */
    padding?: 'none' | 'sm' | 'md' | 'lg';
    /** Center content */
    centered?: boolean;
  }>(),
  {
    as: 'div',
    size: 'lg',
    padding: 'md',
    centered: true,
  },
);

const sizeMap = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

const paddingMap = {
  none: '',
  sm: 'px-4',
  md: 'px-6',
  lg: 'px-8',
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const containerClasses = computed(() => [
  'w-full',
  sizeMap[props.size],
  paddingMap[props.padding],
  props.centered && 'mx-auto',
]);
</script>
