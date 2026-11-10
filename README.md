# Flow Profile v8.2

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node: >=20](https://img.shields.io/badge/Node-%E2%89%A520-brightgreen.svg)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/Bun-1.1%2B-f9f1e1.svg)](https://bun.sh/)
[![Build](https://github.com/yuan-cloud/flow-profile/actions/workflows/ci.yml/badge.svg)](https://github.com/yuan-cloud/flow-profile/actions/workflows/ci.yml)

Flow Profile prepares context from Node-RED flow exports for review and sharing. The CLI and web app generate artifacts locally, with field-name and entropy-based redaction enabled by default. Review the outputs before sharing; heuristic redaction cannot identify every secret.

![Flow Profile web app](apps/web/docs/assets/screenshots/flow-summary.png)

## Why it matters

- Deterministic outputs reduce review drift and make troubleshooting repeatable.
- Redaction-first processing lowers accidental data exposure risk before sharing.
- CLI and web share redaction rules and defaults; their summaries and capabilities differ (see [web limitations](docs/web.md#privacy-and-current-limitations)).

## Who it's for

Flow Profile is for teams operating flow-based automation exports who need deterministic, shareable context bundles with clear governance boundaries, including:

- Node-RED-compatible `flows.json` exports
- Low-code automation tools with graph exports
- Systems that need redaction-first summaries before sharing

## Features

- **Deterministic bundles** — the same input, options and selections produce repeatable artifacts in each interface
- **Redaction-first pipeline** — matching string values are masked before summaries and risk analysis
- **Risk detection (SARIF)** — flags exec nodes, insecure HTTP endpoints, and other hazards
- **Token budgeting** — core/CLI budget strategies; the web token meter estimates size and warns when over budget
- **Capability manifest** — machine-readable summary of what flows can do
- **Subflow expansion** — inlines subflows for complete context
- **Web UI** — auditable, drag-and-drop Vue 3 app
- **Command palette + shortcuts** — fast navigation and export operations
- **Resizable panels** — adjustable three-column workspace layout
- **CLI** — scriptable `build`, `lint`, and `doc` commands for CI pipelines
- **Isomorphic core** — runs in Node.js and browsers (no native dependencies)
- **AI adapters (optional)** — provider-agnostic layer that consumes redacted bundles

## Security & Governance

- **Local processing** — loading flows, building bundles and copying context run in the browser. The web app loads Google Fonts; optional external AI adapters send data to the selected provider after opt-in.
- **Redaction enabled by default** — string values in matching fields are masked. Strict mode also scans eligible high-entropy strings, including labels. Disabling redaction or strict mode can expose sensitive values.
- **Review before sharing** — the prompt preview matches copied/downloaded Markdown. Review JSON artifacts separately; they also appear in the ZIP. Plain-language secrets, object keys and strings excluded by entropy heuristics may remain. See [limitations](docs/web.md#privacy-and-current-limitations).
- **Settings changes invalidate prior output** — the web app clears old previews and diff history while rebuilding with the new privacy settings.

## Architecture

### Monorepo layout

| Package | Description |
|---------|-------------|
| `@flow-profile/core` | Isomorphic core logic — browser compatible, no Node.js APIs |
| `@flow-profile/cli` | Command-line interface (`build`, `lint`, `doc`) |
| `@flow-profile/ui` | Reusable Vue 3 components |
| `@flow-profile/ai` | Optional vendor-agnostic AI adapters |
| `@flow-profile/web` | Vue 3 Context Builder web application |

### Processing pipeline

```
flows.json
  → decode JSON
  → redact       — mask matching string values (enabled by default)
  → parse        — schema-validated ingestion
  → categorize   — group nodes by purpose
  → expand       — inline subflows
  → detect risks — flag security concerns
  → budget       — CLI budget strategy / web estimate and warning
  → output       — generate bundle artifacts
```

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Bun](https://bun.sh/) >= 1.1

### Install

```bash
git clone https://github.com/yuan-cloud/flow-profile.git
cd flow-profile
bun install
```

### CLI

```bash
# Build a context bundle
bun run --cwd packages/cli build
node packages/cli/dist/cli.js build --in ./flows.json --out-dir ./out

# Lint flows for issues
node packages/cli/dist/cli.js lint --in ./flows.json

# Generate documentation
node packages/cli/dist/cli.js doc --in ./flows.json --out ./runbook.md
```

The CLI runs from source in this repo; build it first with `bun run --cwd packages/cli build`.
The CLI is not published yet; install and run from source.

Lint configuration can be provided via a `.flowprofilerc.json` file in the working directory or an explicit `--config` path.

### Web UI

```bash
bun run dev
```

Open http://localhost:5173 and drag-drop a `flows.json` file.

Review the Redaction Report and risk findings. Selecting an affected node adds its sanitized label to the prompt preview. Changing redaction, strict mode or the entropy threshold rebuilds the result. Copy/download uses the same current prompt text; the support ZIP also includes the JSON artifacts and a manifest recording the applied settings. See the [web workflow and limitations](docs/web.md).

## Demo GIFs

![Demo: command palette and processing flow](apps/web/docs/assets/gifs/demo-command-palette.gif)

![Demo: risk findings and context preview](apps/web/docs/assets/gifs/demo-risk-context.gif)

### Project scripts

```bash
bun run test        # run tests (vitest)
bun run lint        # lint (biome)
bun run build       # build all packages
bun run typecheck   # typescript validation
bun run format      # format code
```

On VPS hosts, `bun run build` is most reliable when run locally or in CI due to shared resource limits.

## Output Artifacts

| File | Description |
|------|-------------|
| `about-my-flows.json` | Human-readable flow summary |
| `bundle-manifest.json` | Deterministic content-addressed manifest |
| `capability-manifest.json` | Machine-readable capability inventory |
| `prompt-context.md` | Markdown context ready for assistant consumption |
| `risk-findings.json` | JSON risk findings (CLI `lint --format sarif` provides SARIF separately) |
| `support-bundle.zip` | All artifacts in a single distributable archive |

## Documentation

- [Installation](docs/installation.md)
- [CLI reference](docs/cli.md)
- [Web app guide](docs/web.md)
- [Configuration](docs/config.md)
- [Architecture](docs/architecture.md)
- [AI adapter strategy](docs/ai.md)
- [Testing](docs/TESTING.md)
- [CI examples](docs/ci/README.md)

## Why it exists

This is middleware for safe, deterministic context preparation. It is valuable with AI disabled and stays local-first by design. This repo does not modify or interact with Node-RED or FlowFuse repositories. See [External Repo Safety](docs/EXTERNAL_REPO_SAFETY.md).

## License

[MIT](LICENSE) — (c) 2026 Yuan Liu
