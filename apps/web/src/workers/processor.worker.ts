/// <reference lib="webworker" />

import type { BuildOptions, RebuildOptions, WorkerRequest, WorkerResponse } from '@/types/worker';
import { parseJsonSafe } from '@/utils/errorHandling';
import { buildResultFromInput } from './buildResult';

const ctx = self as DedicatedWorkerGlobalScope;

let isCancelled = false;

const postProgress = (phase: string, percent: number): void => {
  const message: WorkerResponse = { type: 'progress', phase, percent };
  ctx.postMessage(message);
};

const postError = (message: string): void => {
  const error: WorkerResponse = { type: 'error', message };
  ctx.postMessage(error);
};

const checkCancelled = (): boolean => {
  if (!isCancelled) return false;
  const cancelled: WorkerResponse = { type: 'cancelled' };
  ctx.postMessage(cancelled);
  return true;
};

const handleParse = (rawJson: string, options: Partial<BuildOptions> = {}): void => {
  isCancelled = false;
  postProgress('Parsing JSON...', 10);

  const parsedResult = parseJsonSafe(rawJson);
  if (!parsedResult.ok) {
    postError('Invalid JSON input');
    return;
  }
  const parsedInput = parsedResult.value;

  if (checkCancelled()) return;

  try {
    const result = buildResultFromInput(parsedInput, options, postProgress);

    postProgress('Done', 100);
    const message: WorkerResponse = { type: 'result', payload: result };
    ctx.postMessage(message);
  } catch {
    // Parser exceptions can contain input values; do not echo them to the UI.
    postError('Unable to process flow. Check the Node-RED export format.');
  }
};

const handleRebuild = (options: RebuildOptions): void => {
  if (!options.rawJson) {
    postError('Rebuild requires rawJson payload');
    return;
  }
  const { rawJson, ...parameters } = options;
  handleParse(rawJson, parameters);
};

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;

  if (message.type === 'cancel') {
    isCancelled = true;
    return;
  }

  if (message.type === 'parse') {
    handleParse(message.payload, message.options);
    return;
  }

  if (message.type === 'rebuild') {
    handleRebuild(message.payload);
  }
};
