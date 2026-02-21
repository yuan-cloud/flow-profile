# @flow-profile/core

Isomorphic core logic for Flow Profile. Pure TypeScript transforms that run identically in browser and Node.js — no `node:*` APIs allowed.

## Install

```bash
bun add @flow-profile/core
```

## Key Properties

- **Deterministic**: Same input always produces byte-identical output.
- **Browser-compatible**: No `fs`, `path`, `process`, or `node:*` imports.
- **Zero side effects**: Pure functions, no global state.

## Modules

### Parser

Parse raw Node-RED flow JSON into a structured `ParsedFlow`.

```ts
import { parseFlow } from '@flow-profile/core';

const parsed = parseFlow(rawJson);
// parsed.tabs, parsed.nodes, parsed.edges, parsed.configNodes, parsed.subflowDefs
```

### Redaction

Strip secrets from flow data before sharing. Entropy-based detection catches high-randomness strings (API keys, tokens). Pattern-based detection catches known secret field names.

```ts
import { redactSecrets } from '@flow-profile/core';

const { redacted, report } = redactSecrets(rawJson, {
  enabled: true,
  strictMode: true,
  entropyThreshold: 4.5,
});
// report.totalRedacted, report.entries[].fieldPath, report.entries[].maskAssigned
```

### Subflow Expansion

Replace subflow instance nodes with their internal node graphs for full analysis.

```ts
import { expandSubflows } from '@flow-profile/core';

const expanded = expandSubflows(parsed);
// expanded.expansionMetadata.expandedSubflows
```

### Categorization

Assign functional categories (`input`, `output`, `logic`, `config`, `subflow`) to each node.

```ts
import { categorizeFlow, categorizeNodes } from '@flow-profile/core';

const summary = categorizeFlow(expanded);
// summary.counts.input, summary.counts.output, summary.counts.logic
```

### Risk Detection

Static analysis rules that flag injection-prone templates, infinite loops, and other risks.

```ts
import { detectRisks } from '@flow-profile/core';

const result = detectRisks(expanded);
// result.findings[].id, result.findings[].severity, result.findings[].affectedNodes
```

### Capability Extraction

Identify tools (exec, file-write) and resources (HTTP endpoints, MQTT topics) in a flow.

```ts
import { buildCapabilityManifest } from '@flow-profile/core';

const manifest = buildCapabilityManifest(expanded);
// manifest.tools, manifest.resources
```

### Token Budgeting

Estimate token usage across prompt sections and flag budget overruns.

```ts
import { buildTokenBudget } from '@flow-profile/core';

const budget = buildTokenBudget(sections, 8000);
// budget.current, budget.status ('ok' | 'warning' | 'over'), budget.breakdown
```

### Smart Collapse

Shorten function code to fit within token budgets while preserving key logic.

```ts
import { collapseFunctionCode } from '@flow-profile/core';

const result = collapseFunctionCode({ id, name, func: sourceCode });
// result.collapsedCode, result.level, result.originalLines, result.collapsedLines
```

### Output Generators

Build structured outputs from an expanded flow:

```ts
import {
  buildAboutMyFlows,
  buildCapabilityManifestOutput,
  buildPromptContext,
  buildRiskFindingsFromFlow,
  buildSupportBundle,
} from '@flow-profile/core';

const about = buildAboutMyFlows(expanded);       // Structured flow metadata
const context = buildPromptContext(expanded);      // Markdown context for AI
const risks = buildRiskFindingsFromFlow(expanded); // Risk findings report
const bundle = buildSupportBundle(expanded);       // ZIP bundle with all artifacts
```

### Flow Diff

Compare two parsed flows and produce a structured diff.

```ts
import { diffFlows } from '@flow-profile/core';

const diff = diffFlows(flowA, flowB);
```

### Schemas

Zod schemas for validating Node-RED flow JSON.

```ts
import { FlowSchema } from '@flow-profile/core';

const result = FlowSchema.safeParse(rawJson);
```

## Pipeline

The typical processing pipeline:

```
raw JSON → redactSecrets → parseFlow → expandSubflows → [detect, categorize, extract] → outputs
```

## Build

```bash
bun run build
bun run typecheck
bun run test
```
