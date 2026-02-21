# AI_ADAPTERS.md

## Goal
Avoid vendor lock-in. Provide one stable adapter interface.

## Rules
- AI is optional. Tool must work with AI disabled.
- AI input is sanitized bundle by default.
- Always expose prompt inputs and outputs in UI.

## Interface
- generateSuggestions(bundle, options) -> { suggestions, evidenceRefs }

## Failure handling
- Timeout and fallback to deterministic outputs.
- Never block export on AI availability.
