# AI Adapter Strategy

Flow Profile treats AI as an optional, pluggable layer. The core product works
entirely without AI, and all AI integration happens after redaction and
deterministic bundle generation.

## Design Principles

- **Optional by default**: The app is fully usable with AI disabled.
- **Redaction first**: AI only receives the sanitized bundle outputs.
- **Model agnostic**: One stable adapter interface, multiple providers.
- **Transparent inputs/outputs**: Users can inspect exactly what is sent and what returns.
- **Fail closed**: AI errors never block exports or core functionality.

## Adapter Interface (Concept)

```
generateSuggestions(bundle, options) -> { suggestions, evidenceRefs }
```

Where:

- `bundle` is the deterministic, redacted context bundle
- `options` includes provider config, timeouts, and limits
- `suggestions` is a provider-agnostic list of recommendation items
- `evidenceRefs` points back to bundle sections for traceability

## Data Flow

1. Parse flows
2. Expand subflows
3. Redact secrets
4. Detect risks
5. Budget tokens
6. Generate outputs (bundle artifacts)
7. **Optional**: AI adapter consumes the bundle and returns suggestions

## Failure Handling

- Timeouts return an empty suggestion set.
- Errors are surfaced in UI without blocking exports.
- The bundle remains the source of truth.

## Where This Lives in the Repo

- Adapter interfaces and stubs: `packages/ai`
- UI integration: `apps/web` (AI panel consumes adapter output)

## Non-Goals

- Automatic external calls without explicit user intent
- Provider-specific UI that locks the product to one model
- Hidden prompts or opaque transformations
