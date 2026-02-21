<template>
  <div :class="wrapperClasses" role="status" :aria-label="label">
    <FpIcon name="Loader2" :size="size" class="animate-fp-spin" decorative />
    <span v-if="showLabel" class="text-fp-text-muted">{{ label }}</span>
    <span class="sr-only">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * FpSpinner - Flow Profile Loading Spinner Component
 *
 * Indicates loading state.
 *
 * Usage:
 *   <FpSpinner />
 *   <FpSpinner size="lg" label="Loading data..." show-label />
 */

import { computed } from 'vue';
import type { IconSize } from '@/components/icons';
// biome-ignore lint/correctness/noUnusedImports: used in template.
import { FpIcon } from '@/components/icons';

const props = withDefaults(
  defineProps<{
    /** Size */
    size?: IconSize;
    /** Accessibility label */
    label?: string;
    /** Show label text visually */
    showLabel?: boolean;
    /** Center in container */
    centered?: boolean;
  }>(),
  {
    size: 'md',
    label: 'Loading...',
    showLabel: false,
    centered: false,
  },
);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const wrapperClasses = computed(() => [
  'inline-flex items-center gap-2 text-fp-accent-text',
  props.centered && 'justify-center w-full',
]);
</script>
