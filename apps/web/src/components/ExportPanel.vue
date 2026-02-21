<template>
  <section
    data-testid="export-panel"
    class="fp-entrance relative overflow-hidden rounded-fp-3xl border border-slate-800 bg-slate-950/[var(--fp-opacity-prominent)] p-6 shadow-2xl"
    :class="{ 'export-panel--celebrate': celebrate }"
  >
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_65%)]"></div>
    <div class="relative space-y-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="fp-type-overline text-emerald-200">Export</p>
          <h3 class="mt-2 fp-type-h3 text-white">Share or archive your bundle</h3>
          <p class="mt-2 max-w-2xl text-sm text-fp-text-muted">
            Download the deterministic artifacts, or grab just the context summary for quick reuse.
          </p>
          <div class="mt-3 inline-flex items-center gap-2 rounded-fp-full border border-emerald-500/[var(--fp-opacity-default)] bg-emerald-500/[var(--fp-opacity-subtle)] px-3 py-1 text-xs text-emerald-100">
            <Lock :size="14" :stroke-width="2" class="shrink-0" aria-hidden="true" />
            Privacy-first export
          </div>
        </div>
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="statusMessage"
            data-testid="export-status"
            class="flex items-center gap-1.5 rounded-fp-full border px-3 py-1 text-xs"
            :class="[statusClass, celebrate && statusKind === 'success' ? 'export-status--celebrate' : '']"
          >
            <component :is="statusKind === 'success' ? CheckCircle : XCircle" :size="14" :stroke-width="2" />
            {{ statusMessage }}
          </div>
        </Transition>
      </header>

      <div class="grid gap-3 md:grid-cols-2 fp-entrance-stagger">
        <button
          data-testid="copy-context-button"
          :title="`Copy context (${formatShortcut(shortcuts.copyContext)})`"
          class="rounded-fp-2xl border p-4 text-left transition-all duration-fp-fast disabled:cursor-not-allowed disabled:opacity-50 fp-touch-target fp-focus-ring"
          :class="{
            'border-emerald-400 bg-emerald-500/[var(--fp-opacity-subtle)]': copyState === 'success',
            'border-rose-400 bg-rose-500/[var(--fp-opacity-subtle)]': copyState === 'error',
            'border-slate-700 bg-slate-900/[var(--fp-opacity-prominent)] hover:border-emerald-400 hover:bg-slate-900': copyState === 'idle',
          }"
          type="button"
          :disabled="!canExport || isCopying"
          :aria-disabled="!canExport || isCopying"
          @click="handleCopyContext"
        >
          <div class="flex items-center gap-2">
            <component
              :is="copyState === 'success' ? CheckCircle : copyState === 'error' ? XCircle : Copy"
              :size="16"
              :stroke-width="2"
              class="shrink-0 transition-colors duration-fp-fast"
              :class="{
                'text-emerald-400': copyState === 'success',
                'text-rose-400': copyState === 'error',
                'text-slate-400': copyState === 'idle',
              }"
            />
            <p class="text-sm font-semibold text-slate-100">
              {{ copyState === 'success' ? 'Copied!' : copyState === 'error' ? 'Copy failed' : 'Copy context to clipboard' }}
            </p>
          </div>
          <p class="mt-2 text-xs text-fp-text-muted">
            Quick copy of prompt-context.md for pasting into FlowFuse Expert.
          </p>
        </button>

        <button
          :title="`Download prompt context (${formatShortcut(shortcuts.downloadContext)})`"
          class="rounded-fp-2xl border border-slate-700 bg-slate-900/[var(--fp-opacity-prominent)] p-4 text-left transition hover:border-emerald-400 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50 fp-touch-target"
          type="button"
          :disabled="!canExport"
          :aria-disabled="!canExport"
          @click="handleDownloadContext"
        >
          <div class="flex items-center gap-2">
            <Download :size="16" :stroke-width="2" class="shrink-0 text-slate-400" />
            <p class="text-sm font-semibold text-slate-100">Download prompt-context.md</p>
          </div>
          <p class="mt-2 text-xs text-fp-text-muted">Save the full context summary as a file.</p>
        </button>
      </div>

      <div class="rounded-fp-2xl border border-slate-800/[var(--fp-opacity-prominent)] bg-slate-950/[var(--fp-opacity-prominent)] p-4">
        <button
          :title="`Download support bundle (${formatShortcut(shortcuts.downloadBundle)})`"
          class="flex w-full items-center justify-between gap-3 rounded-fp-2xl border border-emerald-500/[var(--fp-opacity-default)] bg-emerald-500/[var(--fp-opacity-subtle)] px-4 py-3 text-left transition hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 fp-touch-target"
          type="button"
          :disabled="!canExport || isBundling"
          :aria-disabled="!canExport || isBundling"
          @click="handleDownloadBundle"
        >
          <div>
            <p class="text-sm font-semibold text-emerald-100">Download support-bundle.zip</p>
            <p class="mt-1 text-xs text-emerald-200/70">
              Includes all artifacts plus bundle-manifest.json with hashes.
            </p>
          </div>
          <span class="text-xs text-emerald-200/80">
            {{ isBundling ? 'Generating...' : 'Download all' }}
          </span>
        </button>

        <div class="mt-4 space-y-2 text-sm text-slate-300">
          <p class="fp-type-overline text-fp-text-muted">Download individually</p>
          <div class="grid gap-2 md:grid-cols-2 fp-entrance-stagger">
            <button
              v-for="file in individualFiles"
              :key="file.name"
              class="rounded-fp-xl border border-slate-800/[var(--fp-opacity-default)] bg-slate-900/[var(--fp-opacity-prominent)] px-3 py-2 text-left text-xs text-slate-200 transition hover:border-emerald-500/[var(--fp-opacity-default)] disabled:cursor-not-allowed disabled:opacity-50 fp-touch-target"
              type="button"
              :disabled="!canExport"
              :aria-disabled="!canExport"
              @click="downloadIndividual(file.name)"
            >
              {{ file.label }}
            </button>
          </div>
        </div>
      </div>

      <p v-if="!canExport" class="text-xs text-fp-text-muted">
        Export becomes available once a flow has been parsed.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template.
import { CheckCircle, Copy, Download, Lock, XCircle } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';

import { useAnnounce } from '@/composables/useAnnounce';
import { useShortcuts } from '@/composables/useShortcuts';
import { useFlowStore } from '@/stores/flow';
import {
  buildSupportBundleZip,
  copyText,
  downloadBytes,
  downloadText,
  exportArtifacts,
} from '@/utils/export';

const flowStore = useFlowStore();
const { aboutMyFlows, promptContext, riskFindings, capabilities, options } = storeToRefs(flowStore);

const statusMessage = ref('');
const statusKind = ref<'success' | 'error'>('success');
const isBundling = ref(false);
const isCopying = ref(false);
const copyState = ref<'idle' | 'success' | 'error'>('idle');
const celebrate = ref(false);
let copyResetTimer: ReturnType<typeof setTimeout> | undefined;
let celebrateTimer: ReturnType<typeof setTimeout> | undefined;
const { announce } = useAnnounce();
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const { shortcuts, formatShortcut } = useShortcuts();

const canExport = computed(() => Boolean(aboutMyFlows.value && promptContext.value));

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const statusClass = computed(() => {
  return statusKind.value === 'success'
    ? 'border-emerald-400/[var(--fp-opacity-default)] bg-emerald-500/[var(--fp-opacity-subtle)] text-emerald-100'
    : 'border-rose-400/[var(--fp-opacity-default)] bg-rose-500/[var(--fp-opacity-subtle)] text-rose-100';
});

const parameters = computed(() => ({
  redactionEnabled: options.value.redactionEnabled,
  strictMode: options.value.strictMode,
  entropyThreshold: options.value.entropyThreshold,
  flattenSubflows: options.value.flattenSubflows,
}));

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const individualFiles = computed(() => [
  { name: 'about-my-flows.json', label: 'about-my-flows.json' },
  { name: 'prompt-context.md', label: 'prompt-context.md' },
  { name: 'risk-findings.json', label: 'risk-findings.json' },
  { name: 'capability-manifest.json', label: 'capability-manifest.json' },
]);

const setStatus = (message: string, kind: 'success' | 'error') => {
  statusMessage.value = message;
  statusKind.value = kind;
  announce(message);
  if (kind === 'success') {
    celebrate.value = true;
    clearTimeout(celebrateTimer);
    celebrateTimer = setTimeout(() => {
      celebrate.value = false;
    }, 900);
  }
  window.setTimeout(() => {
    if (statusMessage.value === message) {
      statusMessage.value = '';
    }
  }, 3500);
};

const getArtifacts = () => ({
  aboutMyFlows: aboutMyFlows.value ?? {},
  promptContext: promptContext.value ?? '',
  riskFindings: riskFindings.value ?? [],
  capabilityManifest: capabilities.value ?? {},
});

const handleCopyContext = async () => {
  if (!promptContext.value) return;
  isCopying.value = true;
  const success = await copyText(promptContext.value);
  isCopying.value = false;
  copyState.value = success ? 'success' : 'error';
  clearTimeout(copyResetTimer);
  copyResetTimer = setTimeout(() => {
    copyState.value = 'idle';
  }, 3500);
  setStatus(
    success ? 'Copied to clipboard' : 'Clipboard unavailable',
    success ? 'success' : 'error',
  );
};

const handleDownloadContext = () => {
  if (!promptContext.value) return;
  downloadText(promptContext.value, 'prompt-context.md', 'text/markdown');
  setStatus('Context downloaded', 'success');
};

const handleDownloadBundle = async () => {
  if (!canExport.value) return;
  isBundling.value = true;
  try {
    const zipBytes = await buildSupportBundleZip(getArtifacts(), parameters.value);
    downloadBytes(zipBytes, 'support-bundle.zip', 'application/zip');
    setStatus('Bundle downloaded', 'success');
  } catch (error) {
    setStatus('Bundle generation failed', 'error');
    console.warn(error);
  } finally {
    isBundling.value = false;
  }
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const downloadIndividual = (name: string) => {
  const artifacts = exportArtifacts(getArtifacts());
  const file = artifacts.find((entry) => entry.name === name);
  if (!file) return;
  const mime = name.endsWith('.md') ? 'text/markdown' : 'application/json';
  downloadText(file.contents, name, mime);
  setStatus(`${name} downloaded`, 'success');
};

defineExpose({
  copyContext: handleCopyContext,
  downloadContext: handleDownloadContext,
  downloadBundle: handleDownloadBundle,
});
</script>

<style scoped>
.export-panel--celebrate::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    circle at top,
    rgba(16, 185, 129, 0.35),
    rgba(16, 185, 129, 0)
  );
  opacity: 0;
  pointer-events: none;
  animation: export-celebrate 900ms ease;
}

.export-status--celebrate {
  animation: export-pop 450ms cubic-bezier(0.2, 0.9, 0.2, 1.2);
}

@keyframes export-celebrate {
  0% {
    opacity: 0;
  }
  30% {
    opacity: 0.6;
  }
  100% {
    opacity: 0;
  }
}

@keyframes export-pop {
  0% {
    transform: scale(0.98);
  }
  40% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}
</style>
