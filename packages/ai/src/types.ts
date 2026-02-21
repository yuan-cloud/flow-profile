export type AboutMyFlows = Record<string, unknown>;

export interface AIOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

export interface Suggestion {
  type: 'explanation' | 'next-step' | 'risk-insight';
  content: string;
  confidence: 'high' | 'medium' | 'low';
  references: string[];
}

export interface AIResult {
  suggestions: Suggestion[];
  evidenceRefs: string[];
  promptUsed: string;
  rawResponse: string;
}
