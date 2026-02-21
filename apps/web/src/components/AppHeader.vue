<template>
  <header class="flex flex-wrap items-center justify-between gap-6" role="banner">
    <div>
      <p class="fp-type-overline text-fp-text-muted">Flow Profile</p>
      <h2 class="mt-2 fp-type-h3 text-white">Context Builder</h2>
      <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-fp-text-muted">
        <span class="inline-flex items-center gap-2 rounded-fp-full border border-emerald-500/[var(--fp-opacity-default)] bg-emerald-500/[var(--fp-opacity-subtle)] px-3 py-1 text-emerald-100">
          <Lock :size="14" :stroke-width="2" class="shrink-0" aria-hidden="true" />
          Local-first
        </span>
        <span>All processing happens locally in your browser.</span>
      </div>
      <p class="mt-2 text-sm text-fp-text-muted">
        Core version {{ coreVersion }} · Web version {{ webVersion }}
      </p>
    </div>
    <div class="flex items-center gap-3">
      <button
        v-if="showLoadAnother"
        type="button"
        :title="`Reset flow (${formatShortcut(shortcuts.resetFlow)})`"
        class="rounded-fp-full border border-emerald-600 bg-emerald-900/[var(--fp-opacity-default)] px-4 py-2 text-xs text-emerald-300 transition-colors hover:bg-emerald-800/[var(--fp-opacity-prominent)] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950"
        @click="handleReset"
      >
        Load Another Flow
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template.
import { Lock } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useShortcuts } from '@/composables/useShortcuts';
import { useAppStore } from '@/stores/app';
import { useFlowStore } from '@/stores/flow';

const appStore = useAppStore();
const flowStore = useFlowStore();

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const { coreVersion, webVersion } = storeToRefs(appStore);
const { appState } = storeToRefs(flowStore);
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const { shortcuts, formatShortcut } = useShortcuts();

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const showLoadAnother = computed(() => appState.value !== 'empty');

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleReset = () => {
  flowStore.reset();
};
</script>
