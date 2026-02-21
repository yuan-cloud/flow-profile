<template>
  <component :is="as" :class="stackClasses">
    <slot />
  </component>
</template>

<script setup lang="ts">
/**
 * FpStack - Flow Profile Stack Layout Component
 *
 * Vertical or horizontal stack with consistent spacing.
 *
 * Usage:
 *   <FpStack gap="md">
 *     <div>Item 1</div>
 *     <div>Item 2</div>
 *   </FpStack>
 *
 *   <FpStack direction="horizontal" gap="lg" align="center">
 *     <span>Left</span>
 *     <span>Right</span>
 *   </FpStack>
 */

import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** HTML element */
    as?: 'div' | 'section' | 'article' | 'nav' | 'ul' | 'ol';
    /** Stack direction */
    direction?: 'vertical' | 'horizontal';
    /** Gap size */
    gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    /** Align items */
    align?: 'start' | 'center' | 'end' | 'stretch';
    /** Justify content */
    justify?: 'start' | 'center' | 'end' | 'between' | 'around';
    /** Wrap items */
    wrap?: boolean;
    /** Full width */
    fullWidth?: boolean;
    /** Full height */
    fullHeight?: boolean;
  }>(),
  {
    as: 'div',
    direction: 'vertical',
    gap: 'md',
    align: 'stretch',
    justify: 'start',
    wrap: false,
    fullWidth: false,
    fullHeight: false,
  },
);

const gapMap = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

const alignMap = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

const justifyMap = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const stackClasses = computed(() => [
  'flex',
  props.direction === 'vertical' ? 'flex-col' : 'flex-row',
  gapMap[props.gap],
  alignMap[props.align],
  justifyMap[props.justify],
  props.wrap && 'flex-wrap',
  props.fullWidth && 'w-full',
  props.fullHeight && 'h-full',
]);
</script>
