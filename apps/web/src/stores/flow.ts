import { defineStore } from 'pinia';
import { computed, reactive, ref, shallowRef, watch } from 'vue';

import { useFlowProcessor } from '@/composables/useFlowProcessor';
import { useIncrementalCompute } from '@/composables/useIncrementalCompute';
import type { BuildResult, RebuildOptions, WorkerProgress } from '@/types/worker';

type AppState = 'empty' | 'loading' | 'parsed' | 'error';

type BudgetStatus = 'unknown' | 'ok' | 'warning' | 'over';

type Debounced = {
  schedule: () => void;
  cancel: () => void;
};

const createDebounce = (callback: () => void, delayMs: number): Debounced => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  const schedule = () => {
    cancel();
    timeout = setTimeout(() => {
      timeout = null;
      callback();
    }, delayMs);
  };

  return { schedule, cancel };
};

const toggleInSet = (current: Set<string>, id: string): Set<string> => {
  const next = new Set(current);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
};

const addToSet = (current: Set<string>, id: string): Set<string> => {
  const next = new Set(current);
  next.add(id);
  return next;
};

const removeFromSet = (current: Set<string>, id: string): Set<string> => {
  const next = new Set(current);
  next.delete(id);
  return next;
};

export const useFlowStore = defineStore('flow', () => {
  const processor = useFlowProcessor();

  const rawInput = ref<string | null>(null);
  const appState = ref<AppState>('empty');
  const errorMessage = ref<string | null>(null);
  const loadingProgress = ref<WorkerProgress | null>(null);
  const buildResult = shallowRef<BuildResult | null>(null);

  const selectedNodes = ref<Set<string>>(new Set());
  const excludedNodes = ref<Set<string>>(new Set());
  const collapsedSubtrees = ref<Set<string>>(new Set());

  const options = reactive({
    redactionEnabled: true,
    strictMode: true,
    entropyThreshold: 4.5,
    flattenSubflows: true,
    includeFunctionCode: false,
    tokenBudget: 8000,
  });

  const aboutMyFlows = computed(() => buildResult.value?.aboutMyFlows ?? null);
  const riskFindings = computed(() => buildResult.value?.riskFindings ?? []);
  const capabilities = computed(() => buildResult.value?.capabilityManifest ?? null);
  const redactionReport = computed(() => buildResult.value?.redactionReport.entries ?? []);
  const buildParameters = computed(() => buildResult.value?.parameters ?? null);

  const incremental = useIncrementalCompute({
    baseResult: buildResult,
    selectedNodes,
    excludedNodes,
    collapsedSubtrees,
    includeFunctionCode: computed(() => options.includeFunctionCode),
    tokenBudget: computed(() => options.tokenBudget),
  });

  const promptContext = computed(() => incremental.promptContext.value);
  const tokenEstimate = computed(() => incremental.tokenEstimate.value);
  const previousPromptContext = incremental.previousPromptContext;

  const budgetStatus = computed<BudgetStatus>(() => {
    const estimate = tokenEstimate.value;
    if (!estimate) return 'unknown';
    return estimate.status;
  });

  watch(
    () => processor.progress.value,
    (value) => {
      loadingProgress.value = value ?? null;
    },
  );

  watch(
    () => processor.result.value,
    (value) => {
      if (!value) return;
      buildResult.value = value;
      appState.value = 'parsed';
      errorMessage.value = null;
      loadingProgress.value = null;
    },
  );

  watch(
    () => processor.error.value,
    (value) => {
      if (!value) return;
      errorMessage.value = value;
      appState.value = 'error';
      loadingProgress.value = null;
    },
  );

  const debouncedRebuild = createDebounce(() => {
    if (!rawInput.value) return;
    appState.value = 'loading';
    const payload: RebuildOptions = { rawJson: rawInput.value, ...rebuildOptionsSnapshot.value };
    processor.rebuild(payload);
  }, 300);

  const rebuildOptionsSnapshot = computed(() => ({
    redactionEnabled: options.redactionEnabled,
    strictMode: options.strictMode,
    entropyThreshold: options.entropyThreshold,
    flattenSubflows: options.flattenSubflows,
  }));

  const invalidateBuild = () => {
    debouncedRebuild.cancel();
    processor.reset();
    buildResult.value = null;
    errorMessage.value = null;
    loadingProgress.value = null;
    appState.value = 'loading';
  };

  watch(
    () => rebuildOptionsSnapshot.value,
    () => {
      if (!rawInput.value) return;
      invalidateBuild();
      debouncedRebuild.schedule();
    },
    { flush: 'sync' },
  );

  const loadFlow = async (jsonString: string) => {
    invalidateBuild();
    rawInput.value = jsonString;
    selectedNodes.value = new Set();
    excludedNodes.value = new Set();
    collapsedSubtrees.value = new Set();
    processor.process(jsonString, rebuildOptionsSnapshot.value);
  };

  const rebuildWithOptions = () => {
    if (!rawInput.value) return;
    invalidateBuild();
    processor.rebuild({ rawJson: rawInput.value, ...rebuildOptionsSnapshot.value });
  };

  const cancelBuild = () => {
    debouncedRebuild.cancel();
    processor.cancel();
    errorMessage.value = null;
    appState.value = buildResult.value ? 'parsed' : 'empty';
  };

  const toggleNode = (nodeId: string) => {
    selectedNodes.value = toggleInSet(selectedNodes.value, nodeId);
  };

  const excludeNode = (nodeId: string) => {
    excludedNodes.value = toggleInSet(excludedNodes.value, nodeId);
  };

  const includeNode = (nodeId: string) => {
    excludedNodes.value = removeFromSet(excludedNodes.value, nodeId);
  };

  const collapseNode = (nodeId: string) => {
    collapsedSubtrees.value = addToSet(collapsedSubtrees.value, nodeId);
  };

  const expandNode = (nodeId: string) => {
    collapsedSubtrees.value = removeFromSet(collapsedSubtrees.value, nodeId);
  };

  const reset = () => {
    rawInput.value = null;
    appState.value = 'empty';
    errorMessage.value = null;
    loadingProgress.value = null;
    buildResult.value = null;
    selectedNodes.value = new Set();
    excludedNodes.value = new Set();
    collapsedSubtrees.value = new Set();
    debouncedRebuild.cancel();
    processor.reset();
  };

  return {
    buildParameters,
    redactionReport,
    aboutMyFlows,
    appState,
    budgetStatus,
    cancelBuild,
    capabilities,
    collapsedSubtrees,
    errorMessage,
    excludedNodes,
    includeNode,
    loadingProgress,
    loadFlow,
    options,
    promptContext,
    previousPromptContext,
    rebuildWithOptions,
    reset,
    riskFindings,
    selectedNodes,
    toggleNode,
    tokenEstimate,
    collapseNode,
    expandNode,
    excludeNode,
    rawInput,
  };
});
