<template>
  <section class="fp-entrance relative overflow-hidden rounded-fp-3xl border border-slate-800 bg-slate-950/[var(--fp-opacity-prominent)] p-6 shadow-2xl">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_65%)]"></div>
    <div class="relative space-y-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-sky-200">Processing</p>
          <h3 class="mt-2 text-2xl font-semibold text-white">Building deterministic context</h3>
          <p class="mt-2 max-w-2xl text-sm text-fp-text-muted">
            The worker is parsing your flow, expanding subflows, and generating the prompt payload.
          </p>
        </div>
        <button
          v-if="canCancel"
          class="rounded-fp-full border border-rose-500/[var(--fp-opacity-medium)] bg-rose-500/[var(--fp-opacity-subtle)] px-5 py-2 text-sm font-medium text-rose-200 transition hover:border-rose-400 hover:bg-rose-500/[var(--fp-opacity-subtle)]"
          type="button"
          @click="emit('cancel')"
        >
          Cancel
        </button>
      </header>

      <div class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <span id="loading-progress-label" class="font-semibold text-sky-200">{{ phaseLabel }}</span>
          <span>{{ percentLabel }}</span>
        </div>
        <div
          class="h-2 overflow-hidden rounded-fp-full bg-slate-800"
          role="progressbar"
          aria-labelledby="loading-progress-label"
          :aria-valuenow="clampedPercent"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuetext="percentLabel"
        >
          <div
            class="h-full bg-sky-400/[var(--fp-opacity-prominent)] transition-all duration-100"
            :style="{ width: `${clampedPercent}%` }"
          ></div>
        </div>
        <div class="flex items-center gap-2 text-xs text-fp-text-muted">
          <span class="h-2 w-2 animate-pulse rounded-fp-full bg-sky-400/[var(--fp-opacity-prominent)]"></span>
          <span>Progress updates stream from the worker thread.</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  phase?: string | null;
  percent?: number | null;
  canCancel?: boolean;
}>();

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const emit = defineEmits<{ cancel: [] }>();

const clampedPercent = computed(() => {
  const value = props.percent ?? 0;
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
});

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const phaseLabel = computed(() => props.phase ?? 'Working...');
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const percentLabel = computed(() => `${clampedPercent.value}%`);
</script>
