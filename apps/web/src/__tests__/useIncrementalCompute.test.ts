import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';

import { useIncrementalCompute } from '@/composables/useIncrementalCompute';
import type { BuildResult, ContextNodeLine } from '@/types/worker';

type RecomputeMetric = {
  invalidated: number;
  recomputed: number;
  reason: string;
};

const buildNodes = (count: number): ContextNodeLine[] =>
  Array.from({ length: count }, (_, index) => {
    const id = `node-${index + 1}`;
    return {
      id,
      label: `Node ${index + 1}`,
      type: 'function',
      tabId: 'tab-1',
      tabLabel: 'Main',
      tokens: 1,
    };
  });

const buildResult = (count: number): BuildResult => {
  const summaryLines = ['# Flow Profile Context', '', `Nodes: ${count}`];
  return {
    parameters: {
      redactionEnabled: true,
      strictMode: true,
      entropyThreshold: 4.5,
      flattenSubflows: true,
    },
    redactionReport: { entries: [], totalRedacted: 0 },
    aboutMyFlows: {},
    promptContext: summaryLines.join('\n'),
    riskFindings: [],
    capabilityManifest: {},
    tokenEstimate: {
      current: 3,
      budget: 8000,
      status: 'ok',
      breakdown: { summary: 3 },
    },
    contextSections: {
      summaryLines,
      nodeLines: buildNodes(count),
      subflowLabels: {},
    },
  };
};

describe('useIncrementalCompute', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears stale preview and diff history immediately on invalidation, including pending work', async () => {
    vi.useFakeTimers();
    const baseResult = ref<BuildResult | null>(buildResult(2));
    const selectedNodes = ref(new Set(['node-1']));
    const incremental = useIncrementalCompute({
      baseResult,
      selectedNodes,
      excludedNodes: ref(new Set()),
      collapsedSubtrees: ref(new Set()),
      includeFunctionCode: ref(false),
      tokenBudget: ref(8000),
    });
    vi.runAllTimers();
    expect(incremental.promptContext.value).toContain('Node 1');
    selectedNodes.value = new Set(['node-2']);
    await nextTick();
    baseResult.value = null;
    expect(incremental.promptContext.value).toBe('');
    expect(incremental.previousPromptContext.value).toBeNull();
    vi.runAllTimers();
    baseResult.value = buildResult(2);
    vi.runAllTimers();
    expect(incremental.promptContext.value).toContain('Node 2');
    expect(incremental.previousPromptContext.value).toBeNull();
  });

  it('never emits unknown selection or subflow IDs as fallback labels', () => {
    vi.useFakeTimers();
    const secret = 'SYNTHETIC-stale-secret-id'; // ubs:ignore — synthetic privacy regression marker, not a credential.
    const incremental = useIncrementalCompute({
      baseResult: ref(buildResult(2)),
      selectedNodes: ref(new Set([secret])),
      excludedNodes: ref(new Set([secret])),
      collapsedSubtrees: ref(new Set([secret])),
      includeFunctionCode: ref(false),
      tokenBudget: ref(8000),
    });
    vi.runAllTimers();
    expect(incremental.promptContext.value).not.toContain(secret);
  });

  it('recomputes only affected nodes after single selection change', async () => {
    vi.useFakeTimers();

    const baseResult = ref<BuildResult | null>(null);
    const selectedNodes = ref<Set<string>>(new Set());
    const excludedNodes = ref<Set<string>>(new Set());
    const collapsedSubtrees = ref<Set<string>>(new Set());
    const includeFunctionCode = ref(false);
    const tokenBudget = ref(8000);
    const metrics: RecomputeMetric[] = [];

    const incremental = useIncrementalCompute({
      baseResult,
      selectedNodes,
      excludedNodes,
      collapsedSubtrees,
      includeFunctionCode,
      tokenBudget,
      debounceMs: 10,
      onRecompute: (metric) => metrics.push(metric as RecomputeMetric),
    });

    baseResult.value = buildResult(1000);
    await nextTick();
    vi.runAllTimers();
    await nextTick();

    selectedNodes.value = new Set(['node-1']);
    await nextTick();
    vi.runAllTimers();
    await nextTick();

    const selectionMetric = [...metrics].reverse().find((metric) => metric.reason === 'selection');
    expect(selectionMetric?.invalidated).toBe(1);
    expect(selectionMetric?.recomputed).toBe(1);
    expect(incremental.promptContext.value).toContain('Selected nodes: 1');
  });

  it('debounces rapid selection changes into a single recompute', async () => {
    vi.useFakeTimers();

    const baseResult = ref<BuildResult | null>(null);
    const selectedNodes = ref<Set<string>>(new Set());
    const excludedNodes = ref<Set<string>>(new Set());
    const collapsedSubtrees = ref<Set<string>>(new Set());
    const includeFunctionCode = ref(false);
    const tokenBudget = ref(8000);
    const metrics: RecomputeMetric[] = [];

    useIncrementalCompute({
      baseResult,
      selectedNodes,
      excludedNodes,
      collapsedSubtrees,
      includeFunctionCode,
      tokenBudget,
      debounceMs: 20,
      onRecompute: (metric) => metrics.push(metric as RecomputeMetric),
    });

    baseResult.value = buildResult(200);
    await nextTick();
    vi.runAllTimers();
    await nextTick();

    selectedNodes.value = new Set(['node-1']);
    selectedNodes.value = new Set(['node-1', 'node-2']);
    selectedNodes.value = new Set(['node-2']);

    await nextTick();
    vi.runAllTimers();
    await nextTick();

    const recomputeEvents = metrics.filter((metric) => metric.reason === 'selection');
    expect(recomputeEvents.length).toBe(1);
  });

  it('outputs empty context when baseResult is null', async () => {
    vi.useFakeTimers();

    const baseResult = ref<BuildResult | null>(null);
    const selectedNodes = ref<Set<string>>(new Set());
    const excludedNodes = ref<Set<string>>(new Set());
    const collapsedSubtrees = ref<Set<string>>(new Set());
    const includeFunctionCode = ref(false);
    const tokenBudget = ref(8000);

    const incremental = useIncrementalCompute({
      baseResult,
      selectedNodes,
      excludedNodes,
      collapsedSubtrees,
      includeFunctionCode,
      tokenBudget,
      debounceMs: 10,
    });

    await nextTick();
    vi.runAllTimers();
    await nextTick();

    expect(incremental.promptContext.value).toBe('');
    expect(incremental.tokenEstimate.value).toBeNull();
  });

  it('clears state when baseResult transitions to null', async () => {
    vi.useFakeTimers();

    const baseResult = ref<BuildResult | null>(buildResult(5));
    const selectedNodes = ref<Set<string>>(new Set());
    const excludedNodes = ref<Set<string>>(new Set());
    const collapsedSubtrees = ref<Set<string>>(new Set());
    const includeFunctionCode = ref(false);
    const tokenBudget = ref(8000);

    const incremental = useIncrementalCompute({
      baseResult,
      selectedNodes,
      excludedNodes,
      collapsedSubtrees,
      includeFunctionCode,
      tokenBudget,
      debounceMs: 10,
    });

    await nextTick();
    vi.runAllTimers();
    await nextTick();

    expect(incremental.promptContext.value).toContain('Nodes: 5');

    baseResult.value = null;
    await nextTick();
    vi.runAllTimers();
    await nextTick();

    expect(incremental.promptContext.value).toBe('');
    expect(incremental.tokenEstimate.value).toBeNull();
    expect(incremental.previousPromptContext.value).toBeNull();
  });

  it('reports token budget status as over when exceeding budget', async () => {
    vi.useFakeTimers();

    const baseResult = ref<BuildResult | null>(null);
    const selectedNodes = ref<Set<string>>(new Set());
    const excludedNodes = ref<Set<string>>(new Set());
    const collapsedSubtrees = ref<Set<string>>(new Set());
    const includeFunctionCode = ref(false);
    const tokenBudget = ref(5); // Very low budget

    const incremental = useIncrementalCompute({
      baseResult,
      selectedNodes,
      excludedNodes,
      collapsedSubtrees,
      includeFunctionCode,
      tokenBudget,
      debounceMs: 10,
    });

    baseResult.value = buildResult(100);
    await nextTick();
    vi.runAllTimers();
    await nextTick();

    expect(incremental.tokenEstimate.value?.status).toBe('over');
  });

  it('reports token budget status as warning near threshold', async () => {
    vi.useFakeTimers();

    const baseResult = ref<BuildResult | null>(null);
    const selectedNodes = ref<Set<string>>(new Set());
    const excludedNodes = ref<Set<string>>(new Set());
    const collapsedSubtrees = ref<Set<string>>(new Set());
    const includeFunctionCode = ref(false);

    // The summary "# Flow Profile Context\n\nNodes: 10" is ~35 chars -> ~9 tokens
    // budget * 0.8 = 8, so 9 > 8 but 9 < 10 => warning
    const tokenBudget = ref(10);

    const incremental = useIncrementalCompute({
      baseResult,
      selectedNodes,
      excludedNodes,
      collapsedSubtrees,
      includeFunctionCode,
      tokenBudget,
      debounceMs: 10,
    });

    baseResult.value = buildResult(10);
    await nextTick();
    vi.runAllTimers();
    await nextTick();

    expect(incremental.tokenEstimate.value?.status).toBe('warning');
  });

  it('tracks previousPromptContext on changes', async () => {
    vi.useFakeTimers();

    const baseResult = ref<BuildResult | null>(null);
    const selectedNodes = ref<Set<string>>(new Set());
    const excludedNodes = ref<Set<string>>(new Set());
    const collapsedSubtrees = ref<Set<string>>(new Set());
    const includeFunctionCode = ref(false);
    const tokenBudget = ref(8000);

    const incremental = useIncrementalCompute({
      baseResult,
      selectedNodes,
      excludedNodes,
      collapsedSubtrees,
      includeFunctionCode,
      tokenBudget,
      debounceMs: 10,
    });

    baseResult.value = buildResult(5);
    await nextTick();
    vi.runAllTimers();
    await nextTick();

    const firstContext = incremental.promptContext.value;
    expect(incremental.previousPromptContext.value).toBeNull();

    // Trigger a change that modifies the context
    selectedNodes.value = new Set(['node-1']);
    await nextTick();
    vi.runAllTimers();
    await nextTick();

    expect(incremental.previousPromptContext.value).toBe(firstContext);
    expect(incremental.promptContext.value).not.toBe(firstContext);
  });

  it('responds to exclusion changes', async () => {
    vi.useFakeTimers();

    const baseResult = ref<BuildResult | null>(null);
    const selectedNodes = ref<Set<string>>(new Set());
    const excludedNodes = ref<Set<string>>(new Set());
    const collapsedSubtrees = ref<Set<string>>(new Set());
    const includeFunctionCode = ref(false);
    const tokenBudget = ref(8000);
    const metrics: RecomputeMetric[] = [];

    const incremental = useIncrementalCompute({
      baseResult,
      selectedNodes,
      excludedNodes,
      collapsedSubtrees,
      includeFunctionCode,
      tokenBudget,
      debounceMs: 10,
      onRecompute: (metric) => metrics.push(metric as RecomputeMetric),
    });

    baseResult.value = buildResult(10);
    await nextTick();
    vi.runAllTimers();
    await nextTick();

    excludedNodes.value = new Set(['node-1', 'node-2']);
    await nextTick();
    vi.runAllTimers();
    await nextTick();

    const exclusionMetric = metrics.find((m) => m.reason === 'exclusion');
    expect(exclusionMetric).toBeDefined();
    expect(exclusionMetric?.invalidated).toBe(2);
    expect(incremental.promptContext.value).toContain('Excluded nodes: 2');
  });

  it('responds to includeFunctionCode toggle', async () => {
    vi.useFakeTimers();

    const baseResult = ref<BuildResult | null>(null);
    const selectedNodes = ref<Set<string>>(new Set());
    const excludedNodes = ref<Set<string>>(new Set());
    const collapsedSubtrees = ref<Set<string>>(new Set());
    const includeFunctionCode = ref(false);
    const tokenBudget = ref(8000);
    const metrics: RecomputeMetric[] = [];

    const incremental = useIncrementalCompute({
      baseResult,
      selectedNodes,
      excludedNodes,
      collapsedSubtrees,
      includeFunctionCode,
      tokenBudget,
      debounceMs: 10,
      onRecompute: (metric) => metrics.push(metric as RecomputeMetric),
    });

    baseResult.value = buildResult(5);
    await nextTick();
    vi.runAllTimers();
    await nextTick();

    includeFunctionCode.value = true;
    await nextTick();
    vi.runAllTimers();
    await nextTick();

    const fnCodeMetric = metrics.find((m) => m.reason === 'functionCode');
    expect(fnCodeMetric).toBeDefined();
    expect(incremental.promptContext.value).toContain('Function code: included');
  });

  it('responds to budget changes', async () => {
    vi.useFakeTimers();

    const baseResult = ref<BuildResult | null>(null);
    const selectedNodes = ref<Set<string>>(new Set());
    const excludedNodes = ref<Set<string>>(new Set());
    const collapsedSubtrees = ref<Set<string>>(new Set());
    const includeFunctionCode = ref(false);
    const tokenBudget = ref(8000);
    const metrics: RecomputeMetric[] = [];

    useIncrementalCompute({
      baseResult,
      selectedNodes,
      excludedNodes,
      collapsedSubtrees,
      includeFunctionCode,
      tokenBudget,
      debounceMs: 10,
      onRecompute: (metric) => metrics.push(metric as RecomputeMetric),
    });

    baseResult.value = buildResult(5);
    await nextTick();
    vi.runAllTimers();
    await nextTick();

    tokenBudget.value = 4000;
    await nextTick();
    vi.runAllTimers();
    await nextTick();

    const budgetMetric = metrics.find((m) => m.reason === 'budget');
    expect(budgetMetric).toBeDefined();
  });
});
