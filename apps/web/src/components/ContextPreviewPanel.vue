<template>
  <section data-testid="context-preview-panel" class="fp-entrance relative overflow-hidden rounded-fp-3xl border border-slate-800 bg-slate-950/[var(--fp-opacity-prominent)] p-6 shadow-2xl">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_65%)]"></div>
    <div class="relative">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="fp-type-overline text-emerald-200">Context Preview</p>
          <h3 class="mt-2 fp-type-h3 text-white">Prompt context panel</h3>
          <p class="mt-2 max-w-2xl text-sm text-fp-text-muted">
            Review the exact, deterministic payload that will be shared with assistants. Toggle diff mode to see
            what changed between rebuilds.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span
            class="rounded-fp-full border px-3 py-1 text-xs"
            :class="budgetClasses"
          >
            {{ tokenLabel }}
          </span>
          <button
            class="rounded-fp-full border border-slate-700 bg-slate-900/[var(--fp-opacity-prominent)] px-3 py-1 text-xs text-slate-200 transition hover:border-emerald-400 hover:text-emerald-200 fp-touch-target"
            type="button"
            :aria-pressed="diffMode"
            @click="diffMode = !diffMode"
          >
            Diff mode: <span class="font-semibold">{{ diffMode ? 'On' : 'Off' }}</span>
          </button>
          <button
            class="rounded-fp-full border border-slate-700 bg-slate-900/[var(--fp-opacity-prominent)] px-3 py-1 text-xs text-slate-200 transition hover:border-emerald-400 hover:text-emerald-200 fp-touch-target"
            type="button"
            :aria-pressed="wrapLines"
            @click="wrapLines = !wrapLines"
          >
            Wrap: <span class="font-semibold">{{ wrapLines ? 'On' : 'Off' }}</span>
          </button>
        </div>
      </header>

      <div class="mt-6 rounded-fp-2xl border border-slate-800/[var(--fp-opacity-prominent)] bg-slate-950/[var(--fp-opacity-prominent)] p-5">
        <div
          v-if="!promptContext"
          class="rounded-fp-xl border border-dashed border-slate-700/[var(--fp-opacity-prominent)] bg-slate-900/[var(--fp-opacity-default)] p-5"
        >
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-fp-2xl border border-emerald-500/[var(--fp-opacity-default)] bg-emerald-500/[var(--fp-opacity-subtle)] text-emerald-100 animate-fp-pulse">
              <FileText :size="20" :stroke-width="2" aria-hidden="true" />
            </div>
            <div>
              <p class="text-sm font-medium text-slate-200">No context yet</p>
              <p class="mt-2 text-sm text-fp-text-muted">
                Load a flow to generate the preview. Once parsed, the prompt context will appear here.
              </p>
              <p class="mt-2 text-xs text-emerald-200">
                Tip: drop a <span class="font-mono">flows.json</span> file to get started.
              </p>
            </div>
          </div>
        </div>

        <div v-else>
          <div v-if="diffMode" @contextmenu.prevent="openMenu($event)">
            <div v-if="diffAvailable" class="space-y-1 text-xs">
              <div
                v-for="(line, index) in diffOutput"
                :key="`diff-${index}`"
                class="flex gap-3 rounded-fp-lg px-2 py-1 font-mono"
                :class="diffLineClass(line.type)"
              >
                <span class="w-4 text-center text-fp-text-muted">{{ diffPrefix(line.type) }}</span>
                <span class="flex-1" :class="wrapClass">{{ line.text.length ? line.text : ' ' }}</span>
              </div>
            </div>
            <div v-else class="rounded-fp-xl border border-slate-800/[var(--fp-opacity-default)] bg-slate-900/[var(--fp-opacity-default)] p-4">
              <p class="text-sm font-medium text-slate-200">No previous context to diff</p>
              <p class="mt-2 text-sm text-fp-text-muted">
                Trigger another rebuild to compare the updated prompt context.
              </p>
            </div>
          </div>

          <pre
            v-else
            class="rounded-fp-xl border border-slate-800/[var(--fp-opacity-default)] bg-slate-950/[var(--fp-opacity-medium)] p-4 text-xs text-slate-200"
            :class="wrapClass"
            v-text="promptContext"
            @contextmenu.prevent="openMenu($event)"
          ></pre>
        </div>
      </div>
    </div>
    <div v-if="menuOpen" class="fp-context-menu__backdrop" @click="closeMenu"></div>
    <div
      v-if="menuOpen"
      class="fp-context-menu"
      role="menu"
      :style="{ left: `${menuPosition.x}px`, top: `${menuPosition.y}px` }"
    >
      <button
        class="fp-context-menu__item"
        type="button"
        role="menuitem"
        :disabled="!menuHasSelection"
        @click="copySelection"
      >
        Copy selection
      </button>
      <button
        v-if="promptContext"
        class="fp-context-menu__item"
        type="button"
        role="menuitem"
        @click="copyAll"
      >
        Copy full context
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template.
import { FileText } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useFlowStore } from '@/stores/flow';
import { diffLines } from '@/utils/diff';
import { copyText } from '@/utils/export';

const flowStore = useFlowStore();
const { promptContext, previousPromptContext, tokenEstimate, budgetStatus, appState } =
  storeToRefs(flowStore);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const diffMode = ref(false);
const wrapLines = ref(true);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const tokenLabel = computed(() => {
  const estimate = tokenEstimate.value;
  if (!estimate) return 'Tokens: --';
  const status =
    budgetStatus.value === 'over'
      ? 'Over budget'
      : budgetStatus.value === 'warning'
        ? 'Near limit'
        : budgetStatus.value === 'ok'
          ? 'Within budget'
          : 'Status unknown';
  return `Tokens: ${estimate.current} / ${estimate.budget} (${status})`;
});

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const budgetClasses = computed(() => {
  if (budgetStatus.value === 'over')
    return 'border-rose-400/[var(--fp-opacity-medium)] bg-rose-500/[var(--fp-opacity-subtle)] text-rose-100';
  if (budgetStatus.value === 'warning')
    return 'border-amber-400/[var(--fp-opacity-medium)] bg-amber-500/[var(--fp-opacity-subtle)] text-amber-100';
  if (budgetStatus.value === 'ok')
    return 'border-emerald-400/[var(--fp-opacity-default)] bg-emerald-500/[var(--fp-opacity-subtle)] text-emerald-100';
  return 'border-slate-700 bg-slate-900/[var(--fp-opacity-prominent)] text-slate-300';
});

const diffAvailable = computed(() => Boolean(previousPromptContext.value));
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const diffOutput = computed(() => {
  if (!diffAvailable.value) return [];
  return diffLines(previousPromptContext.value ?? '', promptContext.value ?? '');
});

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const wrapClass = computed(() =>
  wrapLines.value ? 'whitespace-pre-wrap break-words' : 'whitespace-pre',
);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const diffPrefix = (type: 'equal' | 'add' | 'remove') => {
  if (type === 'add') return '+';
  if (type === 'remove') return '-';
  return ' ';
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const diffLineClass = (type: 'equal' | 'add' | 'remove') => {
  if (type === 'add') return 'bg-emerald-500/[var(--fp-opacity-subtle)] text-emerald-100';
  if (type === 'remove') return 'bg-rose-500/[var(--fp-opacity-subtle)] text-rose-100';
  return 'text-slate-200';
};

const menuOpen = ref(false);
const menuPosition = ref({ x: 0, y: 0 });
const menuHasSelection = ref(false);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const openMenu = (event: MouseEvent) => {
  const selection = window.getSelection()?.toString() ?? '';
  menuHasSelection.value = selection.trim().length > 0;
  menuPosition.value = { x: event.clientX, y: event.clientY };
  menuOpen.value = true;
};

const closeMenu = () => {
  menuOpen.value = false;
};

watch(
  appState,
  () => {
    closeMenu();
    window.getSelection()?.removeAllRanges();
  },
  { flush: 'sync' },
);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const copySelection = async () => {
  if (appState.value !== 'parsed' || !promptContext.value) return;
  const selection = window.getSelection()?.toString() ?? '';
  if (!selection.trim()) return;
  await copyText(selection);
  closeMenu();
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const copyAll = async () => {
  if (appState.value !== 'parsed' || !promptContext.value) return;
  await copyText(promptContext.value);
  closeMenu();
};

const handleGlobalKeydown = (event: KeyboardEvent) => {
  if (!menuOpen.value) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeMenu();
  }
};

const handleGlobalClick = (event: MouseEvent) => {
  if (!menuOpen.value) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest('.fp-context-menu')) return;
  closeMenu();
};

onMounted(() => {
  window.addEventListener('click', handleGlobalClick);
  window.addEventListener('keydown', handleGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', handleGlobalClick);
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>
