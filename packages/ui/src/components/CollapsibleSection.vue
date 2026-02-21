<template>
  <section class="collapsible">
    <button class="collapsible__header" type="button" :aria-expanded="isOpen" @click="toggle">
      <span class="collapsible__title">{{ title }}</span>
      <span v-if="count !== null" class="collapsible__count">{{ count }}</span>
      <svg
        class="collapsible__chevron"
        :data-open="isOpen || undefined"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
    <div class="collapsible__body" :data-open="isOpen || undefined">
      <div class="collapsible__content">
        <slot />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    title: string;
    count?: number | null;
    defaultOpen?: boolean;
  }>(),
  {
    count: null,
    defaultOpen: true,
  },
);

const emit = defineEmits<{
  toggle: [boolean];
}>();

const isOpen = ref(props.defaultOpen);

watch(
  () => props.defaultOpen,
  (value) => {
    isOpen.value = value;
  },
);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const toggle = () => {
  isOpen.value = !isOpen.value;
  emit('toggle', isOpen.value);
};
</script>

<style scoped>
.collapsible {
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: var(--fp-radius-xl);
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
}

.collapsible__header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--fp-space-2);
  padding: var(--fp-space-3) var(--fp-space-3-5);
  background: transparent;
  border: none;
  border-radius: var(--fp-radius-xl);
  color: inherit;
  font: inherit;
  cursor: pointer;
  text-align: left;
  transition: background-color 200ms var(--fp-ease-out);
}

.collapsible__header:hover {
  background: rgba(148, 163, 184, 0.08);
}

.collapsible__title {
  font-weight: 600;
  flex: 1;
}

.collapsible__count {
  font-size: 12px;
  color: var(--fp-text-muted);
}

.collapsible__chevron {
  color: var(--fp-text-muted);
  transform: rotate(-90deg);
  transition: transform 200ms var(--fp-ease-out);
}

.collapsible__chevron[data-open] {
  transform: rotate(0deg);
}

.collapsible__body {
  display: grid;
  grid-template-rows: 0fr;
  overflow: hidden;
  transition: grid-template-rows 200ms var(--fp-ease-out);
}

.collapsible__body[data-open] {
  grid-template-rows: 1fr;
}

.collapsible__content {
  min-height: 0;
  overflow: hidden;
  padding: var(--fp-space-3) var(--fp-space-3-5) var(--fp-space-4);
  visibility: hidden;
  transition: visibility 200ms;
}

.collapsible__body[data-open] > .collapsible__content {
  visibility: visible;
}
</style>
