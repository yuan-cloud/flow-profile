import { onUnmounted, ref, shallowRef } from 'vue';

import type { BuildResult, RebuildOptions, WorkerProgress, WorkerResponse } from '@/types/worker';

export const useFlowProcessor = () => {
  const progress = ref<WorkerProgress | null>(null);
  const result = shallowRef<BuildResult | null>(null);
  const error = ref<string | null>(null);
  const isBusy = ref(false);

  const worker = new Worker(new URL('../workers/processor.worker.ts', import.meta.url), {
    type: 'module',
  });

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

  worker.addEventListener('message', handleMessage);

  const process = (rawJson: string) => {
    error.value = null;
    result.value = null;
    progress.value = { phase: 'Queued', percent: 0 };
    isBusy.value = true;

    worker.postMessage({ type: 'parse', payload: rawJson });
  };

  const rebuild = (options: RebuildOptions) => {
    error.value = null;
    progress.value = { phase: 'Rebuilding', percent: 0 };
    isBusy.value = true;

    worker.postMessage({ type: 'rebuild', payload: options });
  };

  const cancel = () => {
    if (!isBusy.value) return;
    worker.postMessage({ type: 'cancel' });
  };

  const reset = () => {
    progress.value = null;
    result.value = null;
    error.value = null;
    isBusy.value = false;
  };

  onUnmounted(() => {
    worker.removeEventListener('message', handleMessage);
    worker.terminate();
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
