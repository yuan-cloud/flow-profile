import type { AboutMyFlows, AIOptions, AIResult } from './types';

export interface AIAdapter {
  name: string;
  generateSuggestions(bundle: AboutMyFlows, options: AIOptions): Promise<AIResult>;
}
