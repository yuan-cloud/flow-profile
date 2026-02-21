# Best Practices Guides for Flow Profile

> Last updated: January 2026

This directory contains curated best practices guides tailored for the Flow Profile project. A deterministic, local-first context hygiene tool for Node-RED flows.

## Guide index

| Guide | Purpose |
|---|---|
| TYPESCRIPT_ZOD.md | TypeScript strict mode, Zod validation, browser-compatible code |
| SECURITY_REDACTION.md | Secret detection, entropy scanning, deterministic masking |
| VUE_PINIA.md | Vue 3 Composition API, Pinia state management, performance |
| CLI_DESIGN.md | Node.js CLI design, UX patterns, exit codes |
| PERFORMANCE_WORKERS.md | Web Workers, large data handling, UI freeze prevention |
| AI_ADAPTERS.md | LLM-agnostic patterns, adapter architecture |
| TESTING_DETERMINISM.md | Deterministic outputs, canonical JSON, snapshot testing |
| BIOME_CONFIG.md | Biome linter and formatter configuration |

## Project-specific constraints

- packages/core must be browser-compatible. No Node.js APIs.
- TypeScript strict mode is mandatory.
- Zod for all external input validation.
- Determinism is non-negotiable. Same input yields byte-identical output.
- Security by default. Redaction enabled. No secrets written to disk.
- AI optional. Valuable even when AI is off.

## Quick principles

- CLI first. The deterministic bundle is the product.
- UI second. The UI is a context builder and inspector.
- AI optional. Valuable even when AI is off.
- Determinism. Same input yields byte-identical output.
- Security. Redaction on by default, no secret leakage.
- Transparency. Users see exactly what the assistant would see.
