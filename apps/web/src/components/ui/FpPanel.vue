<template>
  <component :is="as" :class="panelClasses">
    <!-- Panel Header -->
    <header v-if="$slots.header || title" :class="headerClasses">
      <div class="flex items-center gap-2">
        <FpIcon v-if="icon" :name="icon" size="md" class="text-fp-text-muted" decorative />
        <slot name="header">
          <h2 :class="titleClasses">{{ title }}</h2>
        </slot>
      </div>
      <div v-if="$slots.actions" class="ml-auto flex items-center gap-2">
        <slot name="actions" />
      </div>
    </header>

    <!-- Panel Content -->
    <div :class="contentClasses">
      <slot />
    </div>
  </component>
</template>

<script setup lang="ts">
/**
 * FpPanel - Flow Profile Panel Component
 *
 * A section container for organizing page layout.
 * Less visually prominent than Card, used for structural grouping.
 *
 * Usage:
 *   <FpPanel title="Risk Findings" icon="AlertTriangle">
 *     <template #actions><FpButton variant="ghost" size="sm">Expand All</FpButton></template>
 *     Panel content
 *   </FpPanel>
 */

import { computed } from 'vue';
// biome-ignore lint/correctness/noUnusedImports: used in template.
import { FpIcon } from '@/components/icons';

type IconName = string;

const props = withDefaults(
  defineProps<{
    /** HTML element to render as */
    as?: 'div' | 'section' | 'aside' | 'nav';
    /** Panel title */
    title?: string;
    /** Header icon */
    icon?: IconName;
    /** Background style */
    background?: 'none' | 'subtle' | 'solid';
    /** Border style */
    bordered?: boolean;
    /** Padding size */
    padding?: 'none' | 'sm' | 'md' | 'lg';
    /** Collapsible panel */
    collapsible?: boolean;
    /** Is collapsed (for collapsible panels) */
    collapsed?: boolean;
  }>(),
  {
    as: 'section',
    background: 'none',
    bordered: false,
    padding: 'md',
    collapsible: false,
    collapsed: false,
  },
);

// Padding mappings
const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

// Panel classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const panelClasses = computed(() => {
  const bgClasses = {
    none: '',
    subtle: 'bg-fp-surface-base/[var(--fp-opacity-medium)]',
    solid: 'bg-fp-surface-elevated',
  };

  return [
    'rounded-fp-lg',
    bgClasses[props.background],
    props.bordered && 'border border-fp-border-subtle',
  ];
});

// Header classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const headerClasses = computed(() => [
  'flex items-center justify-between gap-4',
  'pb-3 mb-3',
  'border-b border-fp-border-subtle',
]);

// Title classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const titleClasses = computed(() => ['fp-type-h3 text-fp-text-primary']);

// Content classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const contentClasses = computed(() => [props.padding !== 'none' && paddingMap[props.padding]]);
</script>
