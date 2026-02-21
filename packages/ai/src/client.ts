import type { AIAdapter } from './adapter';
import type { AboutMyFlows, AIOptions, AIResult } from './types';

const DEFAULT_TIMEOUT_MS = 10_000;

const timeout = (ms: number) =>
  new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('AI request timed out.')), ms);
  });

const emptyResult = (message: string): AIResult => ({
  suggestions: [],
  evidenceRefs: [],
  promptUsed: '',
  rawResponse: message,
});

export const getAISuggestions = async (
  adapter: AIAdapter,
  bundle: AboutMyFlows,
  options: AIOptions,
): Promise<AIResult> => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    return await Promise.race([adapter.generateSuggestions(bundle, options), timeout(timeoutMs)]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI suggestions unavailable.';
    console.warn('AI suggestions unavailable:', error);
    return emptyResult(message);
  }
};
