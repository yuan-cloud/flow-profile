<template>
  <section class="fp-entrance relative overflow-hidden rounded-fp-3xl border border-slate-800 bg-slate-950/[var(--fp-opacity-prominent)] p-6 shadow-2xl">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.16),_transparent_65%)]"></div>
    <div class="relative space-y-6">
      <header>
        <p class="text-xs uppercase tracking-[0.3em] text-rose-200">Error</p>
        <h3 class="mt-2 text-2xl font-semibold text-white">{{ presentation.title }}</h3>
        <p class="mt-2 max-w-2xl text-sm text-slate-300">
          {{ presentation.summary }}
        </p>
      </header>

      <div class="grid gap-3 md:grid-cols-2">
        <button
          class="rounded-fp-2xl border border-slate-700 bg-slate-900/[var(--fp-opacity-prominent)] px-4 py-3 text-left text-sm text-slate-100 transition hover:border-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="!canRetry"
          :aria-disabled="!canRetry"
          @click="emit('retry')"
        >
          Try again
        </button>
        <button
          class="rounded-fp-2xl border border-slate-700 bg-slate-900/[var(--fp-opacity-prominent)] px-4 py-3 text-left text-sm text-slate-100 transition hover:border-rose-400"
          type="button"
          @click="emit('reset')"
        >
          Start over
        </button>
      </div>

      <div class="rounded-fp-2xl border border-rose-500/[var(--fp-opacity-default)] bg-rose-500/[var(--fp-opacity-subtle)] p-4 text-sm text-rose-100">
        <p class="text-xs uppercase tracking-[0.2em] text-rose-200">What happened</p>
        <p class="mt-2 text-sm text-rose-100">{{ presentation.summary }}</p>
        <p v-if="presentation.details" class="mt-2 text-xs text-rose-100/70">
          Details: {{ presentation.details }}
        </p>
      </div>

      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-fp-text-muted">Suggested fixes</p>
        <ul class="mt-3 space-y-2 text-sm text-slate-300">
          <li v-for="(tip, index) in presentation.suggestions" :key="`tip-${index}`" class="flex gap-2">
            <span class="text-rose-300">-</span>
            <span>{{ tip }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { mapWorkerError } from '@/utils/errorMapping';

const props = defineProps<{
  message: string | null;
  canRetry: boolean;
}>();

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const emit = defineEmits<{ retry: []; reset: [] }>();

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const presentation = computed(() => mapWorkerError(props.message));
</script>
