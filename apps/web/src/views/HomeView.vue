<template>
  <div class="space-y-8">
    <button
      v-if="_isDev"
      type="button"
      class="sr-only"
      data-testid="command-palette-trigger"
      @click="commandPaletteOpen = true"
    >
      Open command palette
    </button>
    <DropZone v-if="appState === 'empty'" />
    <ErrorState
      v-else-if="appState === 'error'"
      :message="errorMessage"
      :can-retry="canRetry"
      @retry="handleRetry"
      @reset="handleReset"
    />
    <div v-else class="space-y-8">
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="showAnalysisCelebration"
          class="flex items-center justify-between gap-3 rounded-fp-2xl border border-emerald-500/[var(--fp-opacity-default)] bg-emerald-500/[var(--fp-opacity-subtle)] px-4 py-3 text-sm text-emerald-100"
        >
          <span class="font-medium">Analysis complete</span>
          <span class="text-xs text-emerald-200">Ready to export or review the context.</span>
        </div>
      </Transition>
      <LoadingState
        v-if="appState === 'loading'"
        :phase="progressPhase"
        :percent="progressPercent"
        :can-cancel="true"
        @cancel="handleCancel"
      />
      <MainLayout v-model:mobileTab="mobileTab">
        <template #left>
          <section class="fp-entrance rounded-fp-3xl border border-slate-800 bg-slate-950/[var(--fp-opacity-prominent)] p-5">
            <header class="space-y-2">
              <p class="fp-type-overline text-fp-text-muted">Flow Summary</p>
              <p class="text-sm text-fp-text-muted">Quick signals about your current workspace.</p>
            </header>
            <div class="mt-4 grid gap-4 fp-entrance-stagger">
              <div
                v-for="card in cards"
                :key="card.title"
                class="rounded-fp-2xl border border-slate-800 bg-slate-950/[var(--fp-opacity-prominent)] p-4"
              >
                <p class="fp-type-overline text-fp-text-muted">{{ card.title }}</p>
                <p class="mt-2 text-lg font-medium text-emerald-200">{{ card.detail }}</p>
                <p class="mt-3 text-sm text-fp-text-muted">
                  {{ card.description }}
                </p>
              </div>
            </div>
          </section>
        </template>

        <template #center>
          <ContextPreviewPanel />
        </template>

        <template #right>
          <TokenMeter
            :current="tokenCurrent"
            :budget="tokenBudget"
            :breakdown="tokenBreakdown"
            :status="tokenStatus"
            @update:budget="options.tokenBudget = $event"
          />

          <ExportPanel v-if="appState === 'parsed'" ref="exportPanelRef" />
          <SkeletonPanel v-else-if="appState === 'loading'" :lines="3" label="Loading export panel..." />

          <CollapsibleSection
            title="Redaction"
            :count="redactionReport.length"
            :default-open="sectionState.redaction"
            @toggle="sectionState.redaction = $event"
          >
            <RedactionPanel
              :enabled="options.redactionEnabled"
              :strict-mode="options.strictMode"
              :threshold="options.entropyThreshold"
              :redactions="redactionReport"
              @update:enabled="options.redactionEnabled = $event"
              @update:strict-mode="options.strictMode = $event"
              @update:threshold="options.entropyThreshold = $event"
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Capabilities"
            :count="capabilityCount"
            :default-open="sectionState.capabilities"
            @toggle="sectionState.capabilities = $event"
          >
            <CapabilityPanel v-if="appState === 'parsed'" />
            <SkeletonPanel v-else-if="appState === 'loading'" :lines="2" label="Loading capabilities..." />
          </CollapsibleSection>

          <CollapsibleSection
            title="AI Suggestions"
            :count="aiSuggestionCount"
            :default-open="sectionState.ai"
            @toggle="sectionState.ai = $event"
          >
            <AISuggestionsPanel v-if="appState === 'parsed'" :bundle="aboutMyFlows" />
            <SkeletonPanel v-else-if="appState === 'loading'" :lines="2" label="Loading AI suggestions..." />
          </CollapsibleSection>

          <CollapsibleSection
            title="Risk Findings"
            :count="riskFindings.length"
            :default-open="sectionState.risks"
            @toggle="sectionState.risks = $event"
          >
            <RiskFindingsPanel v-if="appState === 'parsed'" />
            <SkeletonPanel v-else-if="appState === 'loading'" :lines="3" label="Loading risk findings..." />
          </CollapsibleSection>
        </template>
      </MainLayout>
    </div>
    <CommandPalette
      :open="commandPaletteOpen"
      :commands="commandPaletteCommands"
      @close="commandPaletteOpen = false"
      @select="handleCommandSelect"
    />
  </div>
</template>

<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template.
import { CollapsibleSection, RedactionPanel, SkeletonPanel, TokenMeter } from '@flow-profile/ui';
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

// biome-ignore lint/correctness/noUnusedImports: used in template.
import AISuggestionsPanel from '@/components/AISuggestionsPanel.vue';
// biome-ignore lint/correctness/noUnusedImports: used in template.
import CapabilityPanel from '@/components/CapabilityPanel.vue';
// biome-ignore lint/correctness/noUnusedImports: used in template.
import CommandPalette from '@/components/CommandPalette.vue';
// biome-ignore lint/correctness/noUnusedImports: used in template.
import ContextPreviewPanel from '@/components/ContextPreviewPanel.vue';
// biome-ignore lint/correctness/noUnusedImports: used in template.
import DropZone from '@/components/DropZone.vue';
// biome-ignore lint/correctness/noUnusedImports: used in template.
import ErrorState from '@/components/ErrorState.vue';
// biome-ignore lint/correctness/noUnusedImports: used in template.
import ExportPanel from '@/components/ExportPanel.vue';
// biome-ignore lint/correctness/noUnusedImports: used in template.
import LoadingState from '@/components/LoadingState.vue';
// biome-ignore lint/correctness/noUnusedImports: used in template.
import RiskFindingsPanel from '@/components/RiskFindingsPanel.vue';
import { useShortcuts } from '@/composables/useShortcuts';
import { useStatusCards } from '@/composables/useStatusCards';
// biome-ignore lint/correctness/noUnusedImports: used in template.
import MainLayout from '@/layouts/MainLayout.vue';
import { useAIStore } from '@/stores/ai';
import { useFlowStore } from '@/stores/flow';

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const cards = useStatusCards();
const flowStore = useFlowStore();
const aiStore = useAIStore();
const flowRefs = storeToRefs(flowStore);
const aiRefs = storeToRefs(aiStore);
const appState = flowRefs.appState;
const loadingProgress = flowRefs.loadingProgress;
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const errorMessage = flowRefs.errorMessage;
const rawInput = flowRefs.rawInput;
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const aboutMyFlows = flowRefs.aboutMyFlows;
const tokenEstimate = flowRefs.tokenEstimate;
const budgetStatus = flowRefs.budgetStatus;
const options = flowRefs.options;
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const riskFindings = flowRefs.riskFindings;
const capabilities = flowRefs.capabilities;
const showAnalysisCelebration = ref(false);
let celebrationTimer: ReturnType<typeof setTimeout> | undefined;
const mobileTab = ref<'flow' | 'preview' | 'controls'>('preview');
const UI_STATE_KEY = 'fp.ui.state';
const sectionState = ref({
  redaction: true,
  capabilities: false,
  ai: false,
  risks: true,
});

const readUiState = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(UI_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      mobileTab?: 'flow' | 'preview' | 'controls';
      sections?: Partial<typeof sectionState.value>;
    };
  } catch {
    return null;
  }
};

const persistUiState = () => {
  if (typeof window === 'undefined') return;
  const payload = {
    mobileTab: mobileTab.value,
    sections: sectionState.value,
  };
  window.localStorage.setItem(UI_STATE_KEY, JSON.stringify(payload));
};

type ExportPanelApi = {
  copyContext: () => Promise<void>;
  downloadContext: () => void;
  downloadBundle: () => Promise<void>;
};

const exportPanelRef = ref<ExportPanelApi | null>(null);
const commandPaletteOpen = ref(false);
const docsCaptureMode = ref(false);
const { shortcuts, formatShortcut } = useShortcuts();
const _isDev = import.meta.env.DEV;

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const canRetry = computed(() => Boolean(rawInput.value));

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const progressPhase = computed(() => loadingProgress.value?.phase ?? 'Processing...');
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const progressPercent = computed(() => loadingProgress.value?.percent ?? 0);

watch(
  () => appState.value,
  (next, prev) => {
    if (prev === 'loading' && next === 'parsed') {
      showAnalysisCelebration.value = true;
      clearTimeout(celebrationTimer);
      celebrationTimer = setTimeout(() => {
        showAnalysisCelebration.value = false;
      }, 2800);
    }
  },
);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const tokenCurrent = computed(() => tokenEstimate.value?.current ?? 0);
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const tokenBudget = computed(() => tokenEstimate.value?.budget ?? options.value.tokenBudget ?? 0);
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const tokenStatus = computed(() =>
  budgetStatus.value === 'unknown' ? 'auto' : budgetStatus.value,
);
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const tokenBreakdown = computed(() => ({
  summary: tokenEstimate.value?.breakdown?.summary ?? 0,
  nodeDescriptions: tokenEstimate.value?.breakdown?.nodeDescriptions ?? 0,
  functionCode: tokenEstimate.value?.breakdown?.functionCode ?? 0,
  riskFindings: tokenEstimate.value?.breakdown?.riskFindings ?? 0,
}));

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const redactionReport = flowRefs.redactionReport;
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const capabilityCount = computed(() => {
  const manifest = capabilities.value as { tools?: unknown[]; resources?: unknown[] } | null;
  if (!manifest) return 0;
  const tools = Array.isArray(manifest.tools) ? manifest.tools.length : 0;
  const resources = Array.isArray(manifest.resources) ? manifest.resources.length : 0;
  return tools + resources;
});

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const aiSuggestionCount = computed(() => aiRefs.suggestions.value.length);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const commandPaletteCommands = computed(() => [
  {
    id: 'copy-context',
    label: 'Copy prompt context',
    description: 'Copy prompt-context.md to clipboard.',
    shortcut: formatShortcut(shortcuts.value.copyContext),
    category: 'actions',
  },
  {
    id: 'download-context',
    label: 'Download prompt context',
    description: 'Download prompt-context.md.',
    shortcut: formatShortcut(shortcuts.value.downloadContext),
    category: 'actions',
  },
  {
    id: 'download-bundle',
    label: 'Download support bundle',
    description: 'Download support-bundle.zip.',
    shortcut: formatShortcut(shortcuts.value.downloadBundle),
    category: 'actions',
  },
  {
    id: 'reset-flow',
    label: 'Reset flow',
    description: 'Clear the current flow.',
    shortcut: formatShortcut(shortcuts.value.resetFlow),
    category: 'actions',
  },
  {
    id: 'panel-flow',
    label: 'Switch to Flow panel',
    shortcut: formatShortcut(shortcuts.value.panelFlow),
    category: 'navigation',
  },
  {
    id: 'panel-preview',
    label: 'Switch to Preview panel',
    shortcut: formatShortcut(shortcuts.value.panelPreview),
    category: 'navigation',
  },
  {
    id: 'panel-controls',
    label: 'Switch to Controls panel',
    shortcut: formatShortcut(shortcuts.value.panelControls),
    category: 'navigation',
  },
  {
    id: 'toggle-redaction',
    label: options.value.redactionEnabled ? 'Disable redaction' : 'Enable redaction',
    description: 'Toggle automatic redaction in the context.',
    category: 'settings',
  },
  {
    id: 'toggle-strict-mode',
    label: options.value.strictMode ? 'Disable strict mode' : 'Enable strict mode',
    description: 'Toggle stricter redaction rules.',
    category: 'settings',
  },
  {
    id: 'toggle-function-code',
    label: options.value.includeFunctionCode ? 'Hide function code' : 'Include function code',
    description: 'Toggle inclusion of function node code.',
    category: 'settings',
  },
]);

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
};

const matchesShortcut = (event: KeyboardEvent, shortcut: string) => {
  const tokens = shortcut.toLowerCase().split('+');
  const keyToken = tokens.find((token) => !['mod', 'shift', 'alt', 'meta', 'ctrl'].includes(token));
  if (!keyToken) return false;
  const isMac = /mac/i.test(navigator.platform);
  const modPressed = isMac ? event.metaKey : event.ctrlKey;
  if (tokens.includes('mod') !== modPressed) return false;
  if (tokens.includes('shift') !== event.shiftKey) return false;
  if (tokens.includes('alt') !== event.altKey) return false;
  if (tokens.includes('meta') && !event.metaKey) return false;
  if (tokens.includes('ctrl') && !event.ctrlKey) return false;
  return event.key.toLowerCase() === keyToken;
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleCommandSelect = async (id: string) => {
  commandPaletteOpen.value = false;
  if (id === 'copy-context') {
    await exportPanelRef.value?.copyContext?.();
    return;
  }
  if (id === 'download-context') {
    exportPanelRef.value?.downloadContext?.();
    return;
  }
  if (id === 'download-bundle') {
    await exportPanelRef.value?.downloadBundle?.();
    return;
  }
  if (id === 'reset-flow') {
    flowStore.reset();
    return;
  }
  if (id === 'panel-flow') {
    mobileTab.value = 'flow';
    return;
  }
  if (id === 'panel-preview') {
    mobileTab.value = 'preview';
    return;
  }
  if (id === 'panel-controls') {
    mobileTab.value = 'controls';
    return;
  }
  if (id === 'toggle-redaction') {
    options.value.redactionEnabled = !options.value.redactionEnabled;
    return;
  }
  if (id === 'toggle-strict-mode') {
    options.value.strictMode = !options.value.strictMode;
    return;
  }
  if (id === 'toggle-function-code') {
    options.value.includeFunctionCode = !options.value.includeFunctionCode;
  }
};

const handleGlobalShortcut = async (event: KeyboardEvent) => {
  if (isEditableTarget(event.target)) return;
  if (matchesShortcut(event, shortcuts.value.commandPalette)) {
    event.preventDefault();
    commandPaletteOpen.value = !commandPaletteOpen.value;
    return;
  }
  if (commandPaletteOpen.value) return;
  if (matchesShortcut(event, shortcuts.value.copyContext)) {
    event.preventDefault();
    await exportPanelRef.value?.copyContext?.();
    return;
  }
  if (matchesShortcut(event, shortcuts.value.downloadContext)) {
    event.preventDefault();
    exportPanelRef.value?.downloadContext?.();
    return;
  }
  if (matchesShortcut(event, shortcuts.value.downloadBundle)) {
    event.preventDefault();
    await exportPanelRef.value?.downloadBundle?.();
    return;
  }
  if (matchesShortcut(event, shortcuts.value.resetFlow)) {
    event.preventDefault();
    flowStore.reset();
    return;
  }
  if (matchesShortcut(event, shortcuts.value.panelFlow)) {
    event.preventDefault();
    mobileTab.value = 'flow';
    return;
  }
  if (matchesShortcut(event, shortcuts.value.panelPreview)) {
    event.preventDefault();
    mobileTab.value = 'preview';
    return;
  }
  if (matchesShortcut(event, shortcuts.value.panelControls)) {
    event.preventDefault();
    mobileTab.value = 'controls';
  }
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleCancel = () => {
  flowStore.cancelBuild();
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleRetry = () => {
  flowStore.rebuildWithOptions();
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleReset = () => {
  flowStore.reset();
};

onMounted(() => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.has('docsCapture')) {
      docsCaptureMode.value = true;
    }
  }
  const saved = readUiState();
  if (saved?.mobileTab) {
    mobileTab.value = saved.mobileTab;
  }
  if (saved?.sections) {
    sectionState.value = {
      ...sectionState.value,
      ...saved.sections,
    };
  }
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const handler = () => {
      commandPaletteOpen.value = true;
    };
    const devWindow = window as typeof window & {
      __fpSetCommandPaletteOpen?: (value: boolean) => void;
      __fpGetCommandPaletteOpen?: () => boolean;
      __fpOpenCommandPalette?: () => void;
    };
    devWindow.__fpOpenCommandPalette = () => {
      commandPaletteOpen.value = true;
    };
    devWindow.__fpSetCommandPaletteOpen = (value) => {
      commandPaletteOpen.value = value;
    };
    devWindow.__fpGetCommandPaletteOpen = () => commandPaletteOpen.value;
    window.addEventListener('fp:command-palette-open', handler);
    onBeforeUnmount(() => {
      delete devWindow.__fpOpenCommandPalette;
      delete devWindow.__fpSetCommandPaletteOpen;
      delete devWindow.__fpGetCommandPaletteOpen;
      window.removeEventListener('fp:command-palette-open', handler);
    });
  }
  window.addEventListener('keydown', handleGlobalShortcut);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalShortcut);
});

watch([mobileTab, sectionState], persistUiState, { deep: true });
</script>
