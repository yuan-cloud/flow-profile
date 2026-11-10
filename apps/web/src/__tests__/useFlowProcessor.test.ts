import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BuildResult, WorkerResponse } from '@/types/worker';

// Mock Worker before importing the composable
let messageHandler: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
const mockPostMessage = vi.fn();
const mockTerminate = vi.fn();
const mockAddEventListener = vi.fn(
  (_event: string, handler: (event: MessageEvent<WorkerResponse>) => void) => {
    messageHandler = handler;
  },
);
const mockRemoveEventListener = vi.fn();

vi.stubGlobal(
  'Worker',
  class MockWorker {
    postMessage = mockPostMessage;
    terminate = mockTerminate;
    addEventListener = mockAddEventListener;
    removeEventListener = mockRemoveEventListener;
  },
);

// Mock onUnmounted since there's no component context in tests
vi.mock('vue', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    onUnmounted: vi.fn(),
  };
});

// Import after mocks are set up
const { useFlowProcessor } = await import('@/composables/useFlowProcessor');

const fakeBuildResult: BuildResult = {
  parameters: {
    redactionEnabled: true,
    strictMode: true,
    entropyThreshold: 4.5,
    flattenSubflows: true,
  },
  redactionReport: { entries: [], totalRedacted: 0 },
  aboutMyFlows: { version: '0.1', summary: { nodeCount: 5 } },
  promptContext: '# Flow Profile Context\nNodes: 5',
  riskFindings: [],
  capabilityManifest: { tools: [], resources: [] },
  tokenEstimate: { current: 12, budget: 8000, status: 'ok', breakdown: { summary: 12 } },
  contextSections: {
    summaryLines: ['# Flow Profile Context', '', 'Nodes: 5'],
    nodeLines: [],
    subflowLabels: {},
  },
};

const simulateWorkerMessage = (data: WorkerResponse) => {
  if (!messageHandler) throw new Error('No message handler registered');
  messageHandler({ data } as MessageEvent<WorkerResponse>);
};

describe('useFlowProcessor', () => {
  beforeEach(() => {
    mockPostMessage.mockClear();
    mockTerminate.mockClear();
    messageHandler = null;
    mockAddEventListener.mockClear();
  });

  it('registers a message event listener on creation', () => {
    useFlowProcessor();
    expect(mockAddEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('starts in idle state', () => {
    const { isBusy, error, progress, result } = useFlowProcessor();
    expect(isBusy.value).toBe(false);
    expect(error.value).toBeNull();
    expect(progress.value).toBeNull();
    expect(result.value).toBeNull();
  });

  it('process() sets isBusy and posts parse message', () => {
    const { isBusy, progress, process } = useFlowProcessor();
    process('{"nodes":[]}');
    expect(isBusy.value).toBe(true);
    expect(progress.value).toEqual({ phase: 'Queued', percent: 0 });
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'parse',
      payload: '{"nodes":[]}',
      options: undefined,
    });
  });

  it('process() clears previous error and result', () => {
    const { error, result, process } = useFlowProcessor();
    // Simulate previous error state
    simulateWorkerMessage({ type: 'error', message: 'old error' });
    expect(error.value).toBe('old error');

    process('{}');
    expect(error.value).toBeNull();
    expect(result.value).toBeNull();
  });

  it('handles progress messages', () => {
    const { progress, process } = useFlowProcessor();
    process('{}');
    simulateWorkerMessage({ type: 'progress', phase: 'Parsing', percent: 50 });
    expect(progress.value).toEqual({ phase: 'Parsing', percent: 50 });
  });

  it('handles result messages', () => {
    const { result, progress, error, isBusy, process } = useFlowProcessor();
    process('{}');
    simulateWorkerMessage({ type: 'result', payload: fakeBuildResult });

    expect(result.value).toEqual(fakeBuildResult);
    expect(progress.value).toBeNull();
    expect(error.value).toBeNull();
    expect(isBusy.value).toBe(false);
  });

  it('handles error messages', () => {
    const { error, progress, isBusy, process } = useFlowProcessor();
    process('{}');
    simulateWorkerMessage({ type: 'error', message: 'Parse failed' });

    expect(error.value).toBe('Parse failed');
    expect(progress.value).toBeNull();
    expect(isBusy.value).toBe(false);
  });

  it('handles cancelled messages', () => {
    const { progress, isBusy, process } = useFlowProcessor();
    process('{}');
    simulateWorkerMessage({ type: 'cancelled' });

    expect(progress.value).toEqual({ phase: 'Cancelled', percent: 0 });
    expect(isBusy.value).toBe(false);
  });

  it('cancel() terminates the worker when busy', () => {
    const { cancel, process } = useFlowProcessor();
    process('{}');
    cancel();
    expect(mockTerminate).toHaveBeenCalledOnce();
  });

  it('cancel() does nothing when not busy', () => {
    const { cancel } = useFlowProcessor();
    cancel();
    // Only the constructor ran; no message should be posted.
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('reset() clears all state', () => {
    const { process, reset, isBusy, progress, error, result } = useFlowProcessor();
    process('{}');
    simulateWorkerMessage({ type: 'result', payload: fakeBuildResult });

    reset();
    expect(isBusy.value).toBe(false);
    expect(progress.value).toBeNull();
    expect(error.value).toBeNull();
    expect(result.value).toBeNull();
  });

  it('rebuild() sets busy state and posts rebuild message', () => {
    const { rebuild, isBusy, progress } = useFlowProcessor();
    const options = { rawJson: '{}' };
    rebuild(options);

    expect(isBusy.value).toBe(true);
    expect(progress.value).toEqual({ phase: 'Rebuilding', percent: 0 });
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'rebuild',
      payload: options,
    });
  });

  it.each([
    'reset',
    'cancel',
    'rebuild',
    'process',
  ] as const)('ignores late replies after %s replaces an in-flight worker', (action) => {
    const processor = useFlowProcessor();
    processor.process('[]');
    const obsoleteHandler = messageHandler;
    if (!obsoleteHandler) throw new Error('Missing worker listener');
    if (action === 'process') processor.process('[]', { redactionEnabled: true });
    else if (action === 'rebuild') processor.rebuild({ rawJson: '[]', strictMode: true });
    else processor[action]();
    obsoleteHandler({
      data: { type: 'result', payload: fakeBuildResult },
    } as MessageEvent<WorkerResponse>);
    obsoleteHandler({
      data: { type: 'error', message: 'obsolete input' },
    } as MessageEvent<WorkerResponse>);
    expect(processor.result.value).toBeNull();
    expect(processor.error.value).toBeNull();
    expect(mockTerminate).toHaveBeenCalledOnce();
  });
});
