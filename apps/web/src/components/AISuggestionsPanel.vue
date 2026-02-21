<template>
  <section class="fp-entrance relative overflow-hidden rounded-fp-3xl border border-slate-800 bg-slate-950/[var(--fp-opacity-prominent)] p-6 shadow-2xl">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_65%)]"></div>
    <div class="relative space-y-5">
      <header>
        <p class="text-xs uppercase tracking-[0.3em] text-sky-200">AI Suggestions</p>
        <h3 class="mt-2 text-2xl font-semibold text-white">Optional AI insights</h3>
        <p class="mt-2 text-sm text-fp-text-muted">
          AI is off by default. Suggestions are optional, auditable, and never required for exports.
        </p>
      </header>

      <div class="grid gap-3" role="group" aria-labelledby="ai-settings-heading">
        <span id="ai-settings-heading" class="sr-only">AI Settings</span>
        <label class="flex items-center justify-between gap-4 rounded-fp-2xl border border-fp-border-subtle bg-fp-surface-base/[var(--fp-opacity-medium)] px-4 py-3 text-sm text-fp-text-primary">
          <span id="enable-ai-label">Enable AI</span>
          <input v-model="aiStore.enabled" type="checkbox" class="h-4 w-4 accent-fp-accent-primary" aria-labelledby="enable-ai-label" />
        </label>

        <div class="grid gap-3 md:grid-cols-2">
          <label class="grid gap-2 text-xs text-fp-text-muted">
            <span id="provider-label">Provider</span>
            <select v-model="aiStore.provider" class="rounded-fp-xl border border-fp-border-default bg-fp-surface-sunken px-3 py-2 text-sm text-fp-text-primary transition-colors duration-fp-fast focus:outline-none focus:border-fp-border-focus focus:ring-2 focus:ring-fp-border-focus/[var(--fp-opacity-subtle)]" aria-labelledby="provider-label">
              <option v-for="name in adapterNames" :key="name" :value="name">
                {{ name }}
              </option>
            </select>
          </label>
          <label class="grid gap-2 text-xs text-fp-text-muted">
            <span id="model-label">Model (optional)</span>
            <input v-model="aiStore.model" class="rounded-fp-xl border border-fp-border-default bg-fp-surface-sunken px-3 py-2 text-sm text-fp-text-primary transition-colors duration-fp-fast focus:outline-none focus:border-fp-border-focus focus:ring-2 focus:ring-fp-border-focus/[var(--fp-opacity-subtle)]" placeholder="gpt-4o-mini" aria-labelledby="model-label" />
          </label>
        </div>

        <label class="grid gap-2 text-xs text-fp-text-muted">
          <span id="api-key-label">API key (session-only by default)</span>
          <input
            v-model="aiStore.apiKey"
            type="password"
            class="rounded-fp-xl border border-fp-border-default bg-fp-surface-sunken px-3 py-2 text-sm text-fp-text-primary transition-colors duration-fp-fast focus:outline-none focus:border-fp-border-focus focus:ring-2 focus:ring-fp-border-focus/[var(--fp-opacity-subtle)]"
            placeholder="sk-..."
            aria-labelledby="api-key-label"
            autocomplete="off"
          />
        </label>

        <label class="flex items-start gap-3 rounded-fp-2xl border border-fp-border-subtle bg-fp-surface-base/[var(--fp-opacity-medium)] px-4 py-3 text-xs text-fp-text-secondary">
          <input v-model="aiStore.rememberKey" type="checkbox" class="mt-1 h-4 w-4 accent-fp-accent-primary" aria-describedby="remember-key-desc" />
          <span id="remember-key-desc">
            Remember API key on this device (default is session-only).
          </span>
        </label>

        <label class="flex items-start gap-3 rounded-fp-2xl border border-fp-border-subtle bg-fp-surface-base/[var(--fp-opacity-medium)] px-4 py-3 text-xs text-fp-text-secondary">
          <input v-model="aiStore.consented" type="checkbox" class="mt-1 h-4 w-4 accent-fp-accent-primary" aria-describedby="consent-desc" />
          <span id="consent-desc">
            I understand this will send the sanitized bundle (not raw flow JSON) to the selected AI provider.
          </span>
        </label>

        <p class="text-xs text-fp-text-muted">
          Browser note: direct calls to hosted AI APIs can be blocked by CORS. Use a trusted proxy/backend
          if suggestions fail.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3" role="group" aria-label="AI suggestion actions">
        <button
          class="rounded-fp-full border border-slate-700 bg-slate-900/[var(--fp-opacity-prominent)] px-4 py-2 text-xs text-slate-200 transition hover:border-sky-400 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-50 fp-touch-target"
          type="button"
          :disabled="!aiStore.canRequest || aiStore.isLoading"
          :aria-disabled="!aiStore.canRequest || aiStore.isLoading"
          :aria-busy="aiStore.isLoading"
          @click="request"
        >
          {{ aiStore.isLoading ? 'Requesting...' : 'Get AI suggestions' }}
        </button>
        <button
          class="rounded-fp-full border border-slate-800 bg-transparent px-3 py-2 text-xs text-fp-text-muted transition hover:border-slate-600 hover:text-slate-200 fp-touch-target"
          type="button"
          aria-label="Clear AI suggestions"
          @click="clearResults"
        >
          Clear
        </button>
      </div>

      <p v-if="aiStore.errorMessage" class="rounded-fp-xl border border-rose-500/[var(--fp-opacity-default)] bg-rose-500/[var(--fp-opacity-subtle)] p-3 text-sm text-rose-100" role="alert">
        {{ aiStore.errorMessage }}
      </p>

      <div
        v-else-if="aiStore.enabled && !aiStore.isLoading && aiStore.suggestions.length === 0"
        class="rounded-fp-2xl border border-dashed border-sky-400/[var(--fp-opacity-default)] bg-slate-900/[var(--fp-opacity-default)] p-5"
      >
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-fp-2xl border border-sky-400/[var(--fp-opacity-default)] bg-sky-400/[var(--fp-opacity-subtle)] text-sky-100 animate-fp-pulse">
            <Lightbulb :size="20" :stroke-width="2" aria-hidden="true" />
          </div>
          <div>
            <p class="text-sm font-medium text-slate-200">No suggestions yet</p>
            <p class="mt-2 text-sm text-fp-text-muted">
              Request suggestions to generate improvement ideas for this flow.
            </p>
            <p class="mt-2 text-xs text-sky-200">Tip: confirm consent and click “Get AI suggestions”.</p>
          </div>
        </div>
      </div>

      <div v-if="aiStore.suggestions.length" class="space-y-3">
        <p class="text-xs uppercase tracking-[0.2em] text-fp-text-muted">Suggestions</p>
        <div class="grid gap-3 fp-entrance-stagger">
          <div
            v-for="(suggestion, index) in aiStore.suggestions"
            :key="`${suggestion.type}-${index}`"
            class="rounded-fp-2xl border border-slate-800/[var(--fp-opacity-default)] bg-slate-900/[var(--fp-opacity-default)] p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-semibold text-slate-100">{{ suggestion.type }}</p>
              <span class="rounded-fp-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                {{ suggestion.confidence }}
              </span>
            </div>
            <p class="mt-2 text-sm text-slate-300">{{ suggestion.content }}</p>
            <p v-if="suggestion.references.length" class="mt-2 text-xs text-fp-text-muted">
              References: {{ suggestion.references.join(', ') }}
            </p>
          </div>
        </div>
      </div>

      <details v-if="aiStore.promptUsed" class="rounded-fp-2xl border border-slate-800/[var(--fp-opacity-prominent)] bg-slate-950/[var(--fp-opacity-medium)] p-4 text-xs text-slate-300">
        <summary class="cursor-pointer text-sm text-slate-200">Prompt sent to AI</summary>
        <pre class="mt-3 whitespace-pre-wrap text-xs text-slate-300">{{ aiStore.promptUsed }}</pre>
      </details>

      <details v-if="aiStore.rawResponse" class="rounded-fp-2xl border border-slate-800/[var(--fp-opacity-prominent)] bg-slate-950/[var(--fp-opacity-medium)] p-4 text-xs text-slate-300">
        <summary class="cursor-pointer text-sm text-slate-200">Raw AI response</summary>
        <pre class="mt-3 whitespace-pre-wrap text-xs text-slate-300">{{ aiStore.rawResponse }}</pre>
      </details>
    </div>
  </section>
</template>

<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template.
import { Lightbulb } from 'lucide-vue-next';

import { useAIStore } from '@/stores/ai';

const props = defineProps<{
  bundle: Record<string, unknown> | null;
}>();

const aiStore = useAIStore();
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const adapterNames = aiStore.adapterNames;
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const { clearResults, requestSuggestions } = aiStore;

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const request = async () => {
  await requestSuggestions(props.bundle);
};
</script>
