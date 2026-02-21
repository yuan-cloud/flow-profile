# @flow-profile/ai

Optional, vendor-agnostic AI adapter layer for Flow Profile. AI is never required for core functionality — it adds optional suggestions on top of the deterministic pipeline.

## Install

```bash
bun add @flow-profile/ai
```

## Quick Start

```ts
import { createDefaultAdapters, getAISuggestions } from '@flow-profile/ai';
import { buildAboutMyFlows, expandSubflows, parseFlow, redactSecrets } from '@flow-profile/core';

// 1. Run the core pipeline
const { redacted } = redactSecrets(rawJson, { enabled: true });
const flow = expandSubflows(parseFlow(redacted));
const bundle = buildAboutMyFlows(flow);

// 2. Pick an adapter
const adapters = createDefaultAdapters();
const adapter = adapters.openai; // or adapters.mock for testing

// 3. Get suggestions
const result = await getAISuggestions(adapter, bundle, {
  apiKey: process.env.OPENAI_API_KEY,
  timeoutMs: 10_000,
});

for (const suggestion of result.suggestions) {
  console.log(`[${suggestion.type}] ${suggestion.content}`);
}
```

## Adapters

| Adapter | Status | Notes |
|---------|--------|-------|
| `openai` | Available | GPT-4o-mini default, configurable model/baseUrl |
| `mock` | Available | Deterministic responses for testing |
| `anthropic` | Placeholder | Throws `UnsupportedAdapter` error |
| `ollama` | Placeholder | Throws `UnsupportedAdapter` error |

### OpenAI Adapter

```ts
const result = await getAISuggestions(adapters.openai, bundle, {
  apiKey: 'sk-...',
  model: 'gpt-4o',           // default: gpt-4o-mini
  baseUrl: 'https://...',    // default: OpenAI API
  timeoutMs: 15_000,         // default: 10_000
});
```

### Mock Adapter

Returns two deterministic suggestions (one `explanation`, one `next-step`) using bundle keys as references. Useful for UI development and testing without API calls.

```ts
const result = await getAISuggestions(adapters.mock, bundle, {});
// result.suggestions.length === 2, all confidence: 'low'
```

## Types

```ts
interface AIAdapter {
  name: string;
  generateSuggestions(bundle: AboutMyFlows, options: AIOptions): Promise<AIResult>;
}

interface AIOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

interface AIResult {
  suggestions: Suggestion[];
  evidenceRefs: string[];
  promptUsed: string;
  rawResponse: string;
}

interface Suggestion {
  type: 'explanation' | 'next-step' | 'risk-insight';
  content: string;
  confidence: 'high' | 'medium' | 'low';
  references: string[];
}
```

## Error Handling

`getAISuggestions` never throws. On failure (adapter error, timeout, network issue), it returns an empty result with the error message in `rawResponse`:

```ts
const result = await getAISuggestions(adapter, bundle, options);
if (result.suggestions.length === 0) {
  console.warn('AI unavailable:', result.rawResponse);
}
```

## Browser Limitations

Direct browser-to-API calls may be blocked by CORS. For browser usage, route requests through a backend proxy that adds CORS headers and keeps API keys server-side.

## Security

- AI is optional and off by default.
- Always run `redactSecrets` before passing flow data to any AI adapter.
- Avoid persisting API keys in long-lived storage unless users explicitly opt in.

## Build

```bash
bun run build
bun run typecheck
bun run test
```
