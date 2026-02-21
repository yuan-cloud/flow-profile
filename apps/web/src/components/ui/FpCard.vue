<template>
  <component :is="as" :class="cardClasses">
    <!-- Card Header -->
    <header v-if="$slots.header || title" :class="headerClasses">
      <slot name="header">
        <h3 v-if="title" class="fp-type-h4 text-fp-text-primary">{{ title }}</h3>
        <p v-if="subtitle" class="mt-1 text-sm text-fp-text-muted">{{ subtitle }}</p>
      </slot>
      <div v-if="$slots.actions" class="ml-auto">
        <slot name="actions" />
      </div>
    </header>

    <!-- Card Body -->
    <div :class="bodyClasses">
      <slot />
    </div>

    <!-- Card Footer -->
    <footer v-if="$slots.footer" :class="footerClasses">
      <slot name="footer" />
    </footer>
  </component>
</template>

<script setup lang="ts">
/**
 * FpCard - Flow Profile Card Component
 *
 * A container component for grouping related content.
 *
 * Variants:
 *   - elevated: Standard raised card with shadow
 *   - outlined: Card with border, no shadow
 *   - filled: Solid background, no border
 *
 * Usage:
 *   <FpCard title="Settings">
 *     <template #actions><FpButton size="sm">Edit</FpButton></template>
 *     Card content here
 *   </FpCard>
 */

import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** HTML element to render as */
    as?: 'div' | 'article' | 'section' | 'aside';
    /** Card title */
    title?: string;
    /** Card subtitle */
    subtitle?: string;
    /** Visual variant */
    variant?: 'elevated' | 'outlined' | 'filled';
    /** Padding size */
    padding?: 'none' | 'sm' | 'md' | 'lg';
    /** Interactive hover state */
    hoverable?: boolean;
    /** Full height */
    fullHeight?: boolean;
  }>(),
  {
    as: 'div',
    variant: 'elevated',
    padding: 'md',
    hoverable: false,
    fullHeight: false,
  },
);

// Padding mappings
const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

// Card classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const cardClasses = computed(() => {
  const variantClasses = {
    elevated: 'bg-fp-surface-elevated shadow-fp-md border border-fp-border-subtle',
    outlined: 'bg-transparent border border-fp-border-default',
    filled: 'bg-fp-surface-elevated',
  };

  return [
    'rounded-fp-xl overflow-hidden',
    'transition-all duration-fp-fast',
    variantClasses[props.variant],
    props.hoverable && 'hover:shadow-fp-lg hover:border-fp-border-strong cursor-pointer',
    props.fullHeight && 'h-full flex flex-col',
  ];
});

// Header classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const headerClasses = computed(() => [
  'flex items-start gap-4',
  paddingMap[props.padding] || 'px-4 py-3',
  props.variant !== 'filled' && 'border-b border-fp-border-subtle',
]);

// Body classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const bodyClasses = computed(() => [paddingMap[props.padding], props.fullHeight && 'flex-1']);

// Footer classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const footerClasses = computed(() => [
  paddingMap[props.padding] || 'px-4 py-3',
  'border-t border-fp-border-subtle',
  'bg-fp-surface-base/[var(--fp-opacity-medium)]',
]);
</script>
