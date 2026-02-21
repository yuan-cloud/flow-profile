import type { AIAdapter } from '../adapter';
import { buildPrompt } from '../prompt';
import type { AboutMyFlows, AIOptions, AIResult, Suggestion } from '../types';

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_URL = 'https://api.openai.com/v1/chat/completions';

const parseResponse = (content: string): { suggestions: Suggestion[]; evidenceRefs: string[] } => {
  try {
    const parsed = JSON.parse(content) as { suggestions?: Suggestion[]; evidenceRefs?: string[] };
    return {
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      evidenceRefs: Array.isArray(parsed.evidenceRefs) ? parsed.evidenceRefs : [],
    };
  } catch {
    return {
      suggestions: [
        {
          type: 'explanation',
          content: content.trim() || 'No suggestions returned.',
          confidence: 'low',
          references: [],
        },
      ],
      evidenceRefs: [],
    };
  }
};

export class OpenAIAdapter implements AIAdapter {
  name = 'openai';

  async generateSuggestions(bundle: AboutMyFlows, options: AIOptions): Promise<AIResult> {
    if (!options.apiKey) {
      throw new Error('OpenAI API key is required.');
    }

    const prompt = buildPrompt(bundle);
    const response = await fetch(options.baseUrl ?? DEFAULT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model ?? DEFAULT_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content ?? '';
    const parsed = parseResponse(content);

    return {
      suggestions: parsed.suggestions,
      evidenceRefs: parsed.evidenceRefs,
      promptUsed: prompt,
      rawResponse: JSON.stringify(data, null, 2),
    };
  }
}
