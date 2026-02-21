# Architecture

Flow Profile is a local-only toolchain for inspecting Node-RED flow exports. It is organized into three packages:

- `packages/core` - Pure, browser-compatible transforms (no Node APIs).
- `packages/cli` - CLI wrapper around core transforms.
- `apps/web` - Local web UI for interactive inspection.

## Data flow

Typical CLI build flow:

1. Read and parse the input flow JSON.
2. Redact secrets and high-entropy strings.
3. Parse into a typed flow model.
4. Expand subflows (optional).
5. Generate artifacts:
   - About summary
   - Capability manifest
   - Prompt context
   - Risk findings
   - Bundle manifest
6. Package a support bundle zip.

## Extension points

- Risk detection rules live in `packages/core/src/risks/rules`.
- CLI linting relies on those rules and supports per-rule configuration.
- UI components consume the same core outputs for consistent results.

## Local-first design

Flow Profile does not call external services. All processing runs locally and produces deterministic outputs, which makes it suitable for CI and offline review.
