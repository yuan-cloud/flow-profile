import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, shallowRef } from 'vue';

import type { BuildResult } from '@/types/worker';
import { buildResultFromInput } from '@/workers/buildResult';

const mocks = vi.hoisted(() => ({
  mockProcess: vi.fn(),
  mockRebuild: vi.fn(),
  mockCancel: vi.fn(),
  mockProcessorReset: vi.fn(),
  result: { value: null } as { value: BuildResult | null },
}));

vi.mock('@/composables/useFlowProcessor', () => ({
  useFlowProcessor: () => ({
    process: mocks.mockProcess,
    rebuild: mocks.mockRebuild,
    cancel: mocks.mockCancel,
    reset: mocks.mockProcessorReset,
    progress: { value: null },
    result: mocks.result,
    error: { value: null },
    isBusy: { value: false },
  }),
}));

vi.mock('@/composables/useIncrementalCompute', () => ({
  useIncrementalCompute: () => ({
    promptContext: { value: '' },
    previousPromptContext: { value: null },
    tokenEstimate: { value: null },
  }),
}));

import { useFlowStore } from '@/stores/flow';

describe('useFlowStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mocks.result = shallowRef<BuildResult | null>(null);
    mocks.mockProcess.mockClear();
    mocks.mockRebuild.mockClear();
    mocks.mockCancel.mockClear();
    mocks.mockProcessorReset.mockClear();
  });

  afterEach(() => vi.useRealTimers());

  it('invalidates artifacts synchronously and sends the latest privacy options after debounce', async () => {
    vi.useFakeTimers();
    const store = useFlowStore();
    await store.loadFlow('[]');
    mocks.result.value = buildResultFromInput([]);
    await nextTick();
    expect(store.appState).toBe('parsed');
    expect(store.aboutMyFlows).not.toBeNull();
    store.options.redactionEnabled = false;
    expect(store.appState).toBe('loading');
    expect(store.aboutMyFlows).toBeNull();
    expect(store.buildParameters).toBeNull();
    store.options.strictMode = false;
    store.options.entropyThreshold = 6;
    vi.runAllTimers();
    expect(mocks.mockRebuild).toHaveBeenCalledExactlyOnceWith({
      rawJson: '[]',
      redactionEnabled: false,
      strictMode: false,
      entropyThreshold: 6,
      flattenSubflows: true,
    });
  });

  it('cancels pending option rebuilds without restoring older artifacts', async () => {
    vi.useFakeTimers();
    const store = useFlowStore();
    await store.loadFlow('[]');
    mocks.result.value = buildResultFromInput([]);
    await nextTick();
    store.options.strictMode = false;
    store.cancelBuild();
    vi.runAllTimers();
    expect(mocks.mockRebuild).not.toHaveBeenCalled();
    expect(store.aboutMyFlows).toBeNull();
    expect(store.appState).toBe('empty');
  });

  // --- Initial state ---

  it('starts in empty state', () => {
    const store = useFlowStore();
    expect(store.appState).toBe('empty');
    expect(store.rawInput).toBeNull();
    expect(store.errorMessage).toBeNull();
    expect(store.loadingProgress).toBeNull();
  });

  it('has correct default options', () => {
    const store = useFlowStore();
    expect(store.options).toEqual({
      redactionEnabled: true,
      strictMode: true,
      entropyThreshold: 4.5,
      flattenSubflows: true,
      includeFunctionCode: false,
      tokenBudget: 8000,
    });
  });

  it('starts with empty node sets', () => {
    const store = useFlowStore();
    expect(store.selectedNodes.size).toBe(0);
    expect(store.excludedNodes.size).toBe(0);
    expect(store.collapsedSubtrees.size).toBe(0);
  });

  // --- Computed defaults (no build result) ---

  it('aboutMyFlows is null when no build result', () => {
    const store = useFlowStore();
    expect(store.aboutMyFlows).toBeNull();
  });

  it('riskFindings is empty array when no build result', () => {
    const store = useFlowStore();
    expect(store.riskFindings).toEqual([]);
  });

  it('capabilities is null when no build result', () => {
    const store = useFlowStore();
    expect(store.capabilities).toBeNull();
  });

  it('budgetStatus is unknown when no token estimate', () => {
    const store = useFlowStore();
    expect(store.budgetStatus).toBe('unknown');
  });

  it('promptContext defaults to empty string', () => {
    const store = useFlowStore();
    expect(store.promptContext).toBe('');
  });

  it('previousPromptContext is available on store', () => {
    const store = useFlowStore();
    expect(store.previousPromptContext).toBeDefined();
  });

  // --- loadFlow ---

  it('loadFlow sets loading state and stores raw input', async () => {
    const store = useFlowStore();
    await store.loadFlow('{"nodes":[]}');

    expect(store.appState).toBe('loading');
    expect(store.rawInput).toBe('{"nodes":[]}');
    expect(store.errorMessage).toBeNull();
  });

  it('loadFlow calls processor.process with json string', async () => {
    const store = useFlowStore();
    await store.loadFlow('{"nodes":[{"id":"n1"}]}');

    expect(mocks.mockProcess).toHaveBeenCalledWith('{"nodes":[{"id":"n1"}]}', {
      redactionEnabled: true,
      strictMode: true,
      entropyThreshold: 4.5,
      flattenSubflows: true,
    });
  });

  // --- cancelBuild ---

  it('cancelBuild calls processor.cancel', () => {
    const store = useFlowStore();
    store.cancelBuild();
    expect(mocks.mockCancel).toHaveBeenCalled();
  });

  it('cancelBuild returns to empty when no prior result', () => {
    const store = useFlowStore();
    store.cancelBuild();
    expect(store.appState).toBe('empty');
    expect(store.errorMessage).toBeNull();
  });

  it('cancelBuild clears error message', async () => {
    const store = useFlowStore();
    await store.loadFlow('{}');
    store.cancelBuild();
    expect(store.errorMessage).toBeNull();
  });

  // --- rebuildWithOptions ---

  it('rebuildWithOptions is no-op when no rawInput', () => {
    const store = useFlowStore();
    store.rebuildWithOptions();
    expect(mocks.mockRebuild).not.toHaveBeenCalled();
  });

  it('rebuildWithOptions calls processor.rebuild with rawJson', async () => {
    const store = useFlowStore();
    await store.loadFlow('{"test":true}');
    mocks.mockRebuild.mockClear();

    store.rebuildWithOptions();
    expect(store.appState).toBe('loading');
    expect(mocks.mockRebuild).toHaveBeenCalledWith({
      rawJson: '{"test":true}',
      redactionEnabled: true,
      strictMode: true,
      entropyThreshold: 4.5,
      flattenSubflows: true,
    });
  });

  // --- Node manipulation ---

  it('toggleNode adds node to selection', () => {
    const store = useFlowStore();
    store.toggleNode('n1');
    expect(store.selectedNodes.has('n1')).toBe(true);
  });

  it('toggleNode removes node on second call', () => {
    const store = useFlowStore();
    store.toggleNode('n1');
    store.toggleNode('n1');
    expect(store.selectedNodes.has('n1')).toBe(false);
  });

  it('toggleNode manages multiple nodes independently', () => {
    const store = useFlowStore();
    store.toggleNode('n1');
    store.toggleNode('n2');
    expect(store.selectedNodes.has('n1')).toBe(true);
    expect(store.selectedNodes.has('n2')).toBe(true);
    store.toggleNode('n1');
    expect(store.selectedNodes.has('n1')).toBe(false);
    expect(store.selectedNodes.has('n2')).toBe(true);
  });

  it('excludeNode adds node to exclusion set', () => {
    const store = useFlowStore();
    store.excludeNode('n2');
    expect(store.excludedNodes.has('n2')).toBe(true);
  });

  it('excludeNode toggles on second call', () => {
    const store = useFlowStore();
    store.excludeNode('n2');
    store.excludeNode('n2');
    expect(store.excludedNodes.has('n2')).toBe(false);
  });

  it('includeNode removes node from exclusion set', () => {
    const store = useFlowStore();
    store.excludeNode('n3');
    expect(store.excludedNodes.has('n3')).toBe(true);
    store.includeNode('n3');
    expect(store.excludedNodes.has('n3')).toBe(false);
  });

  it('includeNode is no-op for non-excluded node', () => {
    const store = useFlowStore();
    store.includeNode('n4');
    expect(store.excludedNodes.has('n4')).toBe(false);
    expect(store.excludedNodes.size).toBe(0);
  });

  it('collapseNode adds to collapsed set', () => {
    const store = useFlowStore();
    store.collapseNode('sub1');
    expect(store.collapsedSubtrees.has('sub1')).toBe(true);
  });

  it('expandNode removes from collapsed set', () => {
    const store = useFlowStore();
    store.collapseNode('sub1');
    store.expandNode('sub1');
    expect(store.collapsedSubtrees.has('sub1')).toBe(false);
  });

  it('collapseNode is idempotent', () => {
    const store = useFlowStore();
    store.collapseNode('sub1');
    store.collapseNode('sub1');
    expect(store.collapsedSubtrees.has('sub1')).toBe(true);
    expect(store.collapsedSubtrees.size).toBe(1);
  });

  // --- Options ---

  it('options are mutable', () => {
    const store = useFlowStore();
    store.options.redactionEnabled = false;
    expect(store.options.redactionEnabled).toBe(false);
    store.options.tokenBudget = 16000;
    expect(store.options.tokenBudget).toBe(16000);
  });

  // --- Reset ---

  it('reset clears all state to defaults', () => {
    const store = useFlowStore();
    store.toggleNode('n1');
    store.excludeNode('n2');
    store.collapseNode('sub1');

    store.reset();

    expect(store.rawInput).toBeNull();
    expect(store.appState).toBe('empty');
    expect(store.errorMessage).toBeNull();
    expect(store.loadingProgress).toBeNull();
    expect(store.selectedNodes.size).toBe(0);
    expect(store.excludedNodes.size).toBe(0);
    expect(store.collapsedSubtrees.size).toBe(0);
  });

  it('reset calls processor.reset', () => {
    const store = useFlowStore();
    store.reset();
    expect(mocks.mockProcessorReset).toHaveBeenCalled();
  });

  it('reset after loadFlow returns to clean state', async () => {
    const store = useFlowStore();
    await store.loadFlow('{"nodes":[]}');
    store.toggleNode('n1');

    store.reset();

    expect(store.rawInput).toBeNull();
    expect(store.appState).toBe('empty');
    expect(store.selectedNodes.size).toBe(0);
    expect(mocks.mockProcessorReset).toHaveBeenCalled();
  });
});
