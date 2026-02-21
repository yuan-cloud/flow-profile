import type { Ref } from 'vue';
import { ref, watch } from 'vue';

import type { BuildResult, ContextNodeLine, TokenBudget } from '@/types/worker';

type RecomputeReason = 'base' | 'selection' | 'exclusion' | 'collapse' | 'budget' | 'functionCode';

type RecomputeMetrics = {
  invalidated: number;
  recomputed: number;
  reason: RecomputeReason;
  elapsedMs: number;
};

type IncrementalInputs = {
  baseResult: Ref<BuildResult | null>;
  selectedNodes: Ref<Set<string>>;
  excludedNodes: Ref<Set<string>>;
  collapsedSubtrees: Ref<Set<string>>;
  includeFunctionCode: Ref<boolean>;
  tokenBudget: Ref<number>;
  debounceMs?: number;
  onRecompute?: (metrics: RecomputeMetrics) => void;
};

type Debounced = {
  schedule: () => void;
  cancel: () => void;
};

const MAX_LIST = 20;

const estimateTokens = (text: string): number => Math.ceil(text.length / 4);
const nowMs = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

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

const diffSet = (prev: Set<string> | undefined, next: Set<string> | undefined): string[] => {
  const previous = prev ?? new Set<string>();
  const current = next ?? new Set<string>();
  const changed: string[] = [];

  for (const id of previous) {
    if (!current.has(id)) changed.push(id);
  }
  for (const id of current) {
    if (!previous.has(id)) changed.push(id);
  }

  return changed;
};

const formatNodeLine = (node: ContextNodeLine): string => {
  const tabLabel = node.tabLabel ? ` — ${node.tabLabel}` : '';
  return `${node.label} (${node.type})${tabLabel}`;
};

export const useIncrementalCompute = (inputs: IncrementalInputs) => {
  const promptContext = ref('');
  const previousPromptContext = ref<string | null>(null);
  const tokenEstimate = ref<TokenBudget | null>(null);

  const nodeIndex = new Map<string, ContextNodeLine>();
  const nodeTokenCache = new Map<string, number>();
  const subflowLabels = new Map<string, string>();
  const summaryText = ref('');
  const summaryTokens = ref(0);
  const totalNodes = ref(0);

  const pendingNodes = new Set<string>();
  let pendingReason: RecomputeReason = 'base';

  const rebuildCaches = (result: BuildResult) => {
    nodeIndex.clear();
    nodeTokenCache.clear();
    subflowLabels.clear();

    const summaryLines = result.contextSections?.summaryLines ?? result.promptContext.split('\n');
    summaryText.value = summaryLines.join('\n');
    summaryTokens.value = estimateTokens(summaryText.value);

    const nodeLines = result.contextSections?.nodeLines ?? [];
    totalNodes.value = nodeLines.length;
    for (const node of nodeLines) {
      nodeIndex.set(node.id, node);
    }

    const labels = result.contextSections?.subflowLabels ?? {};
    for (const [id, label] of Object.entries(labels)) {
      subflowLabels.set(id, label);
    }
  };

  const getNodeTokens = (nodeId: string): { tokens: number; line: string } => {
    const existing = nodeTokenCache.get(nodeId);
    const node = nodeIndex.get(nodeId);
    const line = node ? `- ${formatNodeLine(node)}` : `- ${nodeId}`;
    if (existing !== undefined) {
      return { tokens: existing, line };
    }
    const tokens = estimateTokens(line);
    nodeTokenCache.set(nodeId, tokens);
    return { tokens, line };
  };

  const buildNodeListSection = (title: string, ids: string[]) => {
    if (ids.length === 0) return { lines: [], tokens: 0, recomputed: 0 };

    const lines = [title];
    let tokens = estimateTokens(title);
    let recomputed = 0;

    const list = ids.slice(0, MAX_LIST);
    for (const id of list) {
      const hadCache = nodeTokenCache.has(id);
      const result = getNodeTokens(id);
      lines.push(result.line);
      tokens += result.tokens;
      if (!hadCache) {
        recomputed += 1;
      }
    }

    if (ids.length > MAX_LIST) {
      const moreLine = `- …and ${ids.length - MAX_LIST} more`;
      lines.push(moreLine);
      tokens += estimateTokens(moreLine);
    }

    return { lines, tokens, recomputed };
  };

  const buildLabelListSection = (
    title: string,
    ids: string[],
    resolveLabel: (id: string) => string,
  ) => {
    if (ids.length === 0) return { lines: [], tokens: 0 };

    const lines = [title];
    let tokens = estimateTokens(title);
    const list = ids.slice(0, MAX_LIST);

    for (const id of list) {
      const line = `- ${resolveLabel(id)}`;
      lines.push(line);
      tokens += estimateTokens(line);
    }

    if (ids.length > MAX_LIST) {
      const moreLine = `- …and ${ids.length - MAX_LIST} more`;
      lines.push(moreLine);
      tokens += estimateTokens(moreLine);
    }

    return { lines, tokens };
  };

  const buildSelectionSection = () => {
    const selected = inputs.selectedNodes.value;
    const excluded = inputs.excludedNodes.value;
    const collapsed = inputs.collapsedSubtrees.value;

    const includeFunctionCode = inputs.includeFunctionCode.value;
    if (
      selected.size === 0 &&
      excluded.size === 0 &&
      collapsed.size === 0 &&
      !includeFunctionCode
    ) {
      return { text: '', tokens: 0, recomputed: 0 };
    }

    let recomputed = 0;
    const lines: string[] = [];
    let tokens = 0;

    const includedCount =
      selected.size > 0 ? selected.size : Math.max(0, totalNodes.value - excluded.size);

    const addLine = (line: string) => {
      lines.push(line);
      tokens += estimateTokens(line);
    };

    addLine('## Node Selection');
    addLine(`Included nodes: ${includedCount}`);
    addLine(`Function code: ${includeFunctionCode ? 'included' : 'excluded'}`);
    addLine(`Selected nodes: ${selected.size}`);

    const selectedIds = Array.from(selected).sort();
    const selectedSection = buildNodeListSection('Selected node list:', selectedIds);
    lines.push(...selectedSection.lines);
    tokens += selectedSection.tokens;
    recomputed += selectedSection.recomputed;

    addLine(`Excluded nodes: ${excluded.size}`);
    const excludedIds = Array.from(excluded).sort();
    const excludedSection = buildNodeListSection('Excluded node list:', excludedIds);
    lines.push(...excludedSection.lines);
    tokens += excludedSection.tokens;
    recomputed += excludedSection.recomputed;

    addLine(`Collapsed subflows: ${collapsed.size}`);
    const collapsedIds = Array.from(collapsed).sort();
    const collapsedSection = buildLabelListSection(
      'Collapsed subflow list:',
      collapsedIds,
      (id) => subflowLabels.get(id) ?? id,
    );
    lines.push(...collapsedSection.lines);
    tokens += collapsedSection.tokens;

    return { text: lines.join('\n'), tokens, recomputed };
  };

  const processChanges = () => {
    const start = nowMs();

    if (!inputs.baseResult.value) {
      promptContext.value = '';
      previousPromptContext.value = null;
      tokenEstimate.value = null;
      pendingNodes.clear();
      return;
    }

    const invalidated = pendingNodes.size;
    for (const nodeId of pendingNodes) {
      nodeTokenCache.delete(nodeId);
    }

    const selectionSection = buildSelectionSection();
    const sections = [summaryText.value, selectionSection.text].filter((value) => value.length > 0);
    const nextContext = sections.join('\n\n');

    if (promptContext.value && promptContext.value !== nextContext) {
      previousPromptContext.value = promptContext.value;
    }
    promptContext.value = nextContext;

    const totalTokens = summaryTokens.value + selectionSection.tokens;
    const budget = inputs.tokenBudget.value;
    tokenEstimate.value = {
      current: totalTokens,
      budget,
      status: totalTokens > budget ? 'over' : totalTokens > budget * 0.8 ? 'warning' : 'ok',
      breakdown: {
        summary: summaryTokens.value,
        nodeDescriptions: selectionSection.tokens,
        functionCode: 0,
        riskFindings: 0,
      },
    };

    const elapsedMs = nowMs() - start;
    inputs.onRecompute?.({
      invalidated,
      recomputed: selectionSection.recomputed,
      reason: pendingReason,
      elapsedMs,
    });

    pendingNodes.clear();
  };

  const debounced = createDebounce(processChanges, inputs.debounceMs ?? 120);

  const queueChange = (reason: RecomputeReason, affectedNodes: string[]) => {
    pendingReason = reason;
    for (const id of affectedNodes) {
      pendingNodes.add(id);
    }
    debounced.schedule();
  };

  watch(
    () => inputs.baseResult.value,
    (result) => {
      if (!result) {
        promptContext.value = '';
        previousPromptContext.value = null;
        tokenEstimate.value = null;
        pendingNodes.clear();
        return;
      }
      rebuildCaches(result);
      queueChange('base', []);
    },
    { immediate: true },
  );

  watch(
    () => inputs.selectedNodes.value,
    (next, prev) => {
      const affected = diffSet(prev, next);
      if (affected.length === 0) return;
      queueChange('selection', affected);
    },
  );

  watch(
    () => inputs.excludedNodes.value,
    (next, prev) => {
      const affected = diffSet(prev, next);
      if (affected.length === 0) return;
      queueChange('exclusion', affected);
    },
  );

  watch(
    () => inputs.collapsedSubtrees.value,
    (next, prev) => {
      const affected = diffSet(prev, next);
      if (affected.length === 0) return;
      queueChange('collapse', affected);
    },
  );

  watch(
    () => inputs.tokenBudget.value,
    () => {
      queueChange('budget', []);
    },
  );

  watch(
    () => inputs.includeFunctionCode.value,
    () => {
      queueChange('functionCode', []);
    },
  );

  return {
    promptContext,
    previousPromptContext,
    tokenEstimate,
  };
};
