import { onUnmounted, ref, shallowRef } from 'vue';

import type {
  BuildOptions,
  BuildResult,
  RebuildOptions,
  WorkerProgress,
  WorkerResponse,
} from '@/types/worker';

export const useFlowProcessor = () => {
  const progress = ref<WorkerProgress | null>(null);
  const result = shallowRef<BuildResult | null>(null);
  const error = ref<string | null>(null);
  const isBusy = ref(false);

  const handleMessage = (event: MessageEvent<WorkerResponse>) => {
    const message = event.data;

    if (message.type === 'progress') {
      progress.value = { phase: message.phase, percent: message.percent };
      return;
    }

    if (message.type === 'result') {
      result.value = message.payload;
      progress.value = null;
      error.value = null;
      isBusy.value = false;
      return;
    }

    if (message.type === 'error') {
      error.value = message.message;
      progress.value = null;
      isBusy.value = false;
      return;
    }

    if (message.type === 'cancelled') {
      progress.value = { phase: 'Cancelled', percent: 0 };
      isBusy.value = false;
    }
  };

  let disposeWorker: () => void;
  const createWorker = () => {
    const source = new Worker(new URL('../workers/processor.worker.ts', import.meta.url), {
      type: 'module',
    });
    const listener = (event: MessageEvent<WorkerResponse>) => {
      // A terminated worker may already have queued a reply. Ignore obsolete results.
      if (source === worker) handleMessage(event);
    };
    source.addEventListener('message', listener);
    disposeWorker = () => {
      source.removeEventListener('message', listener);
      source.terminate();
    };
    return source;
  };
  let worker = createWorker();

  const replaceWorker = () => {
    disposeWorker();
    worker = createWorker();
  };

  const process = (rawJson: string, options?: Partial<BuildOptions>) => {
    if (isBusy.value) replaceWorker();
    error.value = null;
    result.value = null;
    progress.value = { phase: 'Queued', percent: 0 };
    isBusy.value = true;

    worker.postMessage({ type: 'parse', payload: rawJson, options });
  };

  const rebuild = (options: RebuildOptions) => {
    if (isBusy.value) replaceWorker();
    error.value = null;
    result.value = null;
    progress.value = { phase: 'Rebuilding', percent: 0 };
    isBusy.value = true;

    worker.postMessage({ type: 'rebuild', payload: options });
  };

  const cancel = () => {
    if (!isBusy.value) return;
    replaceWorker();
    result.value = null;
    progress.value = null;
    isBusy.value = false;
  };

  const reset = () => {
    replaceWorker();
    progress.value = null;
    result.value = null;
    error.value = null;
    isBusy.value = false;
  };

  onUnmounted(() => {
    disposeWorker();
  });

  return {
    cancel,
    error,
    isBusy,
    process,
    progress,
    rebuild,
    reset,
    result,
  };
};
