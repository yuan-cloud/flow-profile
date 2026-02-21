/// <reference lib="webworker" />

import { categorizeFlow, detectRisksSimple, expandSubflows, parseFlow } from '@flow-profile/core';

import type { BuildResult, RebuildOptions, WorkerRequest, WorkerResponse } from '@/types/worker';
import { parseJsonSafe, toErrorMessage } from '@/utils/errorHandling';
import { buildResultFromParts } from './buildResult';

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

const handleParse = (rawJson: string): void => {
  isCancelled = false;
  postProgress('Parsing JSON...', 10);

  const parsedResult = parseJsonSafe(rawJson);
  if (!parsedResult.ok) {
    postError(toErrorMessage(parsedResult.error, 'Invalid JSON input'));
    return;
  }
  const parsedInput = parsedResult.value;

  if (checkCancelled()) return;

  try {
    postProgress('Parsing flow structure...', 25);
    const parsed = parseFlow(parsedInput);

    if (checkCancelled()) return;

    postProgress('Expanding subflows...', 45);
    const expanded = expandSubflows(parsed);

    if (checkCancelled()) return;

    postProgress('Categorizing nodes...', 60);
    const categorySummary = categorizeFlow(parsed);

    if (checkCancelled()) return;

    postProgress('Analyzing risks...', 75);
    const riskFindings = detectRisksSimple(parsed);

    if (checkCancelled()) return;

    postProgress('Generating outputs...', 90);
    const result: BuildResult = buildResultFromParts({
      parsed,
      expanded,
      categorySummary,
      riskFindings,
    });

    postProgress('Done', 100);
    const message: WorkerResponse = { type: 'result', payload: result };
    ctx.postMessage(message);
  } catch (error) {
    postError(error instanceof Error ? error.message : 'Worker processing error');
  }
};

const handleRebuild = (options: RebuildOptions): void => {
  if (!options.rawJson) {
    postError('Rebuild requires rawJson payload');
    return;
  }
  handleParse(options.rawJson);
};

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;

  if (message.type === 'cancel') {
    isCancelled = true;
    return;
  }

  if (message.type === 'parse') {
    handleParse(message.payload);
    return;
  }

  if (message.type === 'rebuild') {
    handleRebuild(message.payload);
  }
};
