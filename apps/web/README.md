# @flow-profile/web

Vue 3 Context Builder web application for Flow Profile. This is the primary user interface — a local-first tool where users import Node-RED flows, configure redaction and analysis options, preview AI-ready context, and download support bundles.

## Quick Start

```bash
# From the repository root
bun install --frozen-lockfile
bun run dev
```

The dev server starts at `http://localhost:5173`.

## Architecture

The web app consumes all three library packages:

- **@flow-profile/core** — Deterministic pipeline (parse, redact, expand, analyze)
- **@flow-profile/ui** — Reusable Vue 3 components
- **@flow-profile/ai** — Optional AI suggestion adapters

Processing runs in a **Web Worker** to keep the UI responsive during large flow analysis. The worker calls `buildResultFromInput`, which redacts decoded JSON before parsing or deriving any displayed/exported result. Both initial loads and rebuilds receive the selected privacy options and return the applied parameters and redaction report.

Privacy changes immediately invalidate the old preview, diff history and export data. Obsolete workers are terminated and late replies ignored. Preview, clipboard, Markdown downloads and ZIP members use the current result; an in-flight ZIP is discarded if its source changes. See the [web guide](../../docs/web.md#privacy-and-current-limitations) for heuristic redaction limits and differences from the CLI.

### State Management

Pinia stores manage application state:

| Store | Responsibility |
|-------|---------------|
| `useFlowStore` | Flow data, processing pipeline, redaction options |
| `useAIStore` | AI adapter selection, suggestions, API configuration |
| `useAppStore` | UI state, theme, panel visibility |

### Composables

| Composable | Purpose |
|------------|---------|
| `useFlowProcessor` | Orchestrates the core pipeline with worker offloading |
| `useIncrementalCompute` | Incremental recomputation on option changes |
| `useStatusCards` | Derives status card data from flow state |
| `useAnnounce` | Accessible screen reader announcements |

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite dev server with HMR |
| `bun run build` | Production build to `dist/` |
| `bun run preview` | Preview production build locally |
| `bun run test` | Run Vitest unit tests |
| `bun run test:e2e` | Run Playwright E2E tests |
| `bun run typecheck` | Type-check with vue-tsc |
| `bun run lint` | Lint with Biome |

## Tech Stack

- **Vue 3** with Composition API
- **Pinia 3** for state management
- **Vue Router 4** for routing
- **Vite 7** for build tooling
- **Tailwind CSS 3** for utility styling
- **Lucide** for icons
- **Playwright** for E2E testing

## Build

```bash
bun run build
```

Output goes to `dist/`. The build is a static SPA — no server required. All processing happens client-side.
