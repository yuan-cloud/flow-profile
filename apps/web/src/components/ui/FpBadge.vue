<template>
  <span :class="badgeClasses">
    <FpIcon v-if="icon" :name="icon" :size="iconSize" decorative />
    <slot />
  </span>
</template>

<script setup lang="ts">
/**
 * FpBadge - Flow Profile Badge Component
 *
 * A small label for status, counts, or categorization.
 *
 * Variants:
 *   - neutral: Default gray
 *   - primary: Accent color
 *   - success/warning/error/info: Semantic colors
 *   - severity-high/medium/low: Risk severity
 *
 * Usage:
 *   <FpBadge variant="success">Active</FpBadge>
 *   <FpBadge variant="severity-high" icon="AlertOctagon">High</FpBadge>
 */

import { computed } from 'vue';
import type { IconSize } from '@/components/icons';
// biome-ignore lint/correctness/noUnusedImports: used in template.
import { FpIcon } from '@/components/icons';

type IconName = string;

const props = withDefaults(
  defineProps<{
    /** Badge variant */
    variant?:
      | 'neutral'
      | 'primary'
      | 'success'
      | 'warning'
      | 'error'
      | 'info'
      | 'severity-high'
      | 'severity-medium'
      | 'severity-low';
    /** Size */
    size?: 'sm' | 'md' | 'lg';
    /** Optional icon */
    icon?: IconName;
    /** Pill shape (fully rounded) */
    pill?: boolean;
  }>(),
  {
    variant: 'neutral',
    size: 'md',
    pill: false,
  },
);

// Icon size mapping
const iconSizeMap: Record<string, IconSize> = {
  sm: 'sm',
  md: 'sm',
  lg: 'md',
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const iconSize = computed<IconSize>(() => iconSizeMap[props.size]);

// Badge classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const badgeClasses = computed(() => {
  const variantClasses = {
    neutral: 'bg-fp-surface-hover text-fp-text-secondary',
    primary: 'bg-fp-accent-subtle text-fp-accent-text',
    success: 'bg-fp-success-bg text-fp-success-text',
    warning: 'bg-fp-warning-bg text-fp-warning-text',
    error: 'bg-fp-error-bg text-fp-error-text',
    info: 'bg-fp-info-bg text-fp-info-text',
    'severity-high': 'bg-fp-severity-high-bg text-fp-severity-high-text',
    'severity-medium': 'bg-fp-severity-medium-bg text-fp-severity-medium-text',
    'severity-low': 'bg-fp-severity-low-bg text-fp-severity-low-text',
  };

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2 py-0.5 text-xs gap-1.5',
    lg: 'px-2.5 py-1 text-sm gap-1.5',
  };

  return [
    'inline-flex items-center font-medium',
    props.pill ? 'rounded-fp-full' : 'rounded-fp-md',
    variantClasses[props.variant],
    sizeClasses[props.size],
  ];
});
</script>
