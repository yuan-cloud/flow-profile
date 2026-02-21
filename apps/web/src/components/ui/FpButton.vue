<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
    :aria-busy="loading"
    :aria-disabled="disabled"
  >
    <!-- Loading spinner -->
    <FpIcon
      v-if="loading"
      name="Loader2"
      :size="iconSize"
      class="animate-fp-spin"
      decorative
    />

    <!-- Leading icon -->
    <FpIcon
      v-else-if="iconLeft"
      :name="iconLeft"
      :size="iconSize"
      decorative
    />

    <!-- Button content -->
    <span v-if="$slots.default" :class="{ 'opacity-0': loading && !iconLeft && !iconRight }">
      <slot />
    </span>

    <!-- Trailing icon -->
    <FpIcon
      v-if="iconRight && !loading"
      :name="iconRight"
      :size="iconSize"
      decorative
    />
  </button>
</template>

<script setup lang="ts">
/**
 * FpButton - Flow Profile Button Component
 *
 * A versatile button component with multiple variants and states.
 *
 * Variants:
 *   - primary: Main action (emerald accent)
 *   - secondary: Secondary action (slate)
 *   - ghost: Minimal, text-only appearance
 *   - danger: Destructive actions (rose)
 *
 * Sizes (padding-based for text buttons, fixed dimensions for icon-only):
 *   - sm: 8px 12px (py-2 px-3)
 *   - md: 10px 16px (py-2.5 px-4)
 *   - lg: 12px 24px (py-3 px-6)
 *
 * Usage:
 *   <FpButton variant="primary" size="md">Save</FpButton>
 *   <FpButton variant="ghost" icon-left="Plus">Add Item</FpButton>
 *   <FpButton variant="danger" :loading="isDeleting">Delete</FpButton>
 */

import { computed } from 'vue';
import type { IconSize } from '@/components/icons';
// biome-ignore lint/correctness/noUnusedImports: used in template.
import { FpIcon } from '@/components/icons';

type IconName = string;

const props = withDefaults(
  defineProps<{
    /** Button type attribute */
    type?: 'button' | 'submit' | 'reset';
    /** Visual style variant */
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    /** Size preset */
    size?: 'sm' | 'md' | 'lg';
    /** Disabled state */
    disabled?: boolean;
    /** Loading state (shows spinner, disables button) */
    loading?: boolean;
    /** Full width button */
    fullWidth?: boolean;
    /** Icon on the left */
    iconLeft?: IconName;
    /** Icon on the right */
    iconRight?: IconName;
    /** Icon-only button (square, no text) */
    iconOnly?: boolean;
  }>(),
  {
    type: 'button',
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    fullWidth: false,
    iconOnly: false,
  },
);

// Map button size to icon size
const iconSizeMap: Record<string, IconSize> = {
  sm: 'sm',
  md: 'sm',
  lg: 'md',
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const iconSize = computed<IconSize>(() => iconSizeMap[props.size]);

// Compute button classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const buttonClasses = computed(() => {
  const base = [
    // Base styles
    'inline-flex items-center justify-center gap-2',
    'font-medium rounded-fp-lg',
    'transition-all duration-fp-fast ease-fp-out',
    'hover:scale-[1.02] active:scale-[0.98]',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-fp-surface-base',
    // Disabled state
    'disabled:cursor-not-allowed disabled:opacity-50',
  ];

  // Size classes
  const sizeClasses = {
    sm: props.iconOnly ? 'h-7 w-7 text-xs' : 'py-2 px-3 text-xs',
    md: props.iconOnly ? 'h-9 w-9 text-sm' : 'py-2.5 px-4 text-sm',
    lg: props.iconOnly ? 'h-11 w-11 text-base' : 'py-3 px-6 text-base',
  };

  // Variant classes
  const variantClasses = {
    primary: [
      'bg-fp-accent-primary text-fp-text-inverse',
      'hover:bg-fp-accent-primary-hover',
      'active:bg-fp-accent-primary-active',
      'focus:ring-fp-accent-primary',
    ],
    secondary: [
      'bg-fp-surface-elevated text-fp-text-primary',
      'border border-fp-border-default',
      'hover:bg-fp-surface-hover hover:border-fp-border-strong',
      'active:bg-fp-surface-active',
      'focus:ring-fp-border-focus',
    ],
    ghost: [
      'bg-transparent text-fp-text-secondary',
      'hover:bg-fp-surface-hover hover:text-fp-text-primary',
      'active:bg-fp-surface-active',
      'focus:ring-fp-border-focus',
    ],
    danger: [
      'bg-rose-500 text-white',
      'hover:bg-rose-600',
      'active:bg-rose-700',
      'focus:ring-rose-500',
    ],
  };

  return [
    ...base,
    sizeClasses[props.size],
    ...variantClasses[props.variant],
    props.fullWidth && 'w-full',
  ];
});
</script>
