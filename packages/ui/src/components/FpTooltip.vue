<template>
  <span class="fp-tooltip" @mouseenter="open = true" @mouseleave="open = false">
    <button
      class="fp-tooltip__trigger"
      type="button"
      :aria-describedby="contentId"
      :aria-label="label"
      @focus="open = true"
      @blur="open = false"
    >
      <HelpCircle :size="14" :stroke-width="2" aria-hidden="true" />
    </button>
    <span :id="contentId" class="fp-tooltip__content" role="tooltip" :data-open="open">
      <slot>{{ text }}</slot>
    </span>
  </span>
</template>

<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template.
import { HelpCircle } from 'lucide-vue-next';
import { ref, useId } from 'vue';

const props = withDefaults(
  defineProps<{
    text?: string;
    label?: string;
  }>(),
  {
    text: '',
    label: 'Help',
  },
);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const open = ref(false);
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const contentId = `fp-tooltip-${useId()}`;

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const text = props.text;
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const label = props.label;
</script>

<style scoped>
.fp-tooltip {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.fp-tooltip__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
  cursor: pointer;
  transition: border-color 150ms ease, background-color 150ms ease, transform 150ms ease;
}

.fp-tooltip__trigger:hover,
.fp-tooltip__trigger:focus-visible {
  border-color: rgba(56, 189, 248, 0.7);
  background: rgba(15, 23, 42, 0.9);
  transform: translateY(-1px);
  outline: none;
}

.fp-tooltip__content {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  max-width: 260px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.95);
  color: #e2e8f0;
  font-size: 12px;
  line-height: 1.4;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.4);
  opacity: 0;
  transform: translateY(-4px);
  pointer-events: none;
  transition: opacity 150ms ease, transform 150ms ease;
  z-index: 20;
}

.fp-tooltip__content[data-open='true'] {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
</style>
