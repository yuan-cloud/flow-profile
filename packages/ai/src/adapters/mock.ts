import type { AIAdapter } from '../adapter';
import { buildPrompt } from '../prompt';
import type { AboutMyFlows, AIOptions, AIResult, Suggestion } from '../types';

const buildMockSuggestions = (bundle: AboutMyFlows): Suggestion[] => {
  const references = Object.keys(bundle).slice(0, 2);
  return [
    {
      type: 'explanation',
      content: 'Mock summary: review the bundle structure before sharing externally.',
      confidence: 'low',
      references,
    },
    {
      type: 'next-step',
      content: 'Mock next step: validate redaction settings and regenerate the context bundle.',
      confidence: 'low',
      references,
    },
  ];
};

export class MockAdapter implements AIAdapter {
  name = 'mock';

  async generateSuggestions(bundle: AboutMyFlows, _options: AIOptions): Promise<AIResult> {
    return {
      suggestions: buildMockSuggestions(bundle),
      evidenceRefs: [],
      promptUsed: buildPrompt(bundle),
      rawResponse: JSON.stringify({
        suggestions: buildMockSuggestions(bundle),
        evidenceRefs: [],
      }),
    };
  }
}
