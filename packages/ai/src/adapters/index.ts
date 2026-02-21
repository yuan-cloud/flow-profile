import type { AIAdapter } from '../adapter';
import { MockAdapter } from './mock';
import { OpenAIAdapter } from './openai';
import { UnsupportedAdapter } from './unsupported';

export const createDefaultAdapters = (): Record<string, AIAdapter> => ({
  openai: new OpenAIAdapter(),
  anthropic: UnsupportedAdapter.placeholder('anthropic', 'Not implemented yet.'),
  ollama: UnsupportedAdapter.placeholder('ollama', 'Not implemented yet.'),
  mock: new MockAdapter(),
});
