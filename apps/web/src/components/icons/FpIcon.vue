<template>
  <component
    :is="iconComponent"
    :size="sizeValue"
    :stroke-width="strokeWidth"
    :class="iconClasses"
    :aria-hidden="decorative"
    :aria-label="decorative ? undefined : label"
    :role="decorative ? 'presentation' : 'img'"
  />
</template>

<script setup lang="ts">
/**
 * FpIcon - Flow Profile Icon Component
 *
 * A wrapper around Lucide icons that provides:
 * - Consistent sizing (sm, md, lg, xl)
 * - Color inheritance from parent text color
 * - Accessibility attributes
 * - Stroke width customization
 *
 * Usage:
 *   <FpIcon name="AlertCircle" size="md" />
 *   <FpIcon name="Check" size="sm" class="text-fp-success" />
 *
 * Available icons: https://lucide.dev/icons
 */

import * as icons from 'lucide-vue-next';
import { type Component, computed } from 'vue';

type IconName = keyof typeof icons;

const props = withDefaults(
  defineProps<{
    /** Icon name from Lucide (PascalCase) */
    name: IconName;
    /** Size preset: sm (16px), md (20px), lg (24px), xl (32px) */
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /** Custom size in pixels (overrides size preset) */
    customSize?: number;
    /** Stroke width (default: 2) */
    strokeWidth?: number;
    /** Accessibility label (required if not decorative) */
    label?: string;
    /** Mark as decorative (hides from screen readers) */
    decorative?: boolean;
  }>(),
  {
    size: 'md',
    strokeWidth: 2,
    decorative: true,
  },
);

// Size mapping
const sizeMap = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const sizeValue = computed(() => props.customSize ?? sizeMap[props.size]);

// Get the icon component
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const iconComponent = computed<Component>(() => {
  // biome-ignore lint/performance/noDynamicNamespaceImportAccess: icon registry lookup is intentional.
  const icon = icons[props.name];
  if (!icon) {
    console.warn(`[FpIcon] Unknown icon: ${props.name}`);
    return icons.HelpCircle; // Fallback icon
  }
  return icon as Component;
});

// Icon classes for styling
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const iconClasses = computed(() => [
  'fp-icon',
  `fp-icon--${props.size}`,
  'inline-block',
  'shrink-0',
]);
</script>

<style scoped>
.fp-icon {
  /* Inherit color from parent text */
  color: currentColor;
}
</style>
