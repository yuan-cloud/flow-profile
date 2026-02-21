# Testing Guide

## Overview

This repository intentionally separates test runners by responsibility.

The goal is to avoid runner conflicts, false failures, and accidental execution of browser-only tests in Node environments.

**Test runners are split by domain, not convenience.**

---

## Test Runners

### Vitest

Used for:

- Unit tests
- Integration tests
- Determinism and snapshot tests
- Performance tests
- CLI tests
- Core logic validation

Vitest is the default runner for most of the repository.

It runs against:

- `packages/core`
- `packages/cli`
- Shared utilities
- Web worker logic (non-browser)

Vitest **must not** execute browser E2E tests.

---

### Playwright

Used for:

- Browser end-to-end (E2E) tests only
- UI smoke tests
- Real browser behavior validation

Playwright runs **only** against the web app.

It lives under:

- `apps/web/e2e/`

Playwright tests are intentionally isolated from Vitest.

#### Headless VPS Note

Some headless VPS environments do not permit Chromium sandbox initialization. If Playwright fails with
`sandbox_host_linux.cc:41` or the browser exits immediately, run E2E tests and docs capture on a machine
with full browser support (local workstation or CI runner with user namespaces enabled).

---

## How to Run Tests

### Core, CLI, and Utilities (Vitest)

Run from the repository root:

```
bun run test
```

**WARNING:** Do NOT use bare `bun test` — that invokes Bun's built-in test runner instead of Vitest. Bun's runner does not support `vi.*` globals, causing ~136 false failures. Always use `bun run test` to invoke the Vitest-based script defined in package.json.

This runs all Vitest-managed tests, including:

- `packages/core/**`
- `packages/cli/**`
- Determinism and snapshot tests
- Performance benchmarks

---

### Web E2E Tests (Playwright)

Run Playwright explicitly:

```
bun run --cwd apps/web test:e2e
```

You can also run from the `apps/web` directory:

```
cd apps/web
bun run test:e2e
```

Playwright tests are located at:

- `apps/web/e2e/*.pw.ts`

### Docs Capture (Screenshots + GIF frames)

Docs capture runs the Playwright docs config and writes assets to:

- `apps/web/docs/assets/screenshots/`
- `apps/web/docs/assets/gifs/`

Run with a dev server already listening on `DOCS_CAPTURE_URL`:

```
# Terminal 1
cd apps/web
bun run dev -- --force --host 127.0.0.1

# Terminal 2
cd apps/web
DOCS_CAPTURE=1 DOCS_CAPTURE_URL=http://127.0.0.1:5173 bun run test:e2e -- --config playwright.docs.config.ts --project=chromium -g "docs capture"
```

On failure, the docs capture test writes debug artifacts to `apps/web/docs/assets/screenshots/`.
These artifacts are for investigation only and should not be committed.

---

## File Naming Conventions

Browser E2E tests use the `.pw.ts` suffix.

Example:

- `smoke.pw.ts`

This suffix is **intentional**.

It prevents Bun and Vitest from auto-discovering Playwright tests and attempting to execute them in a Node environment.

---

## Important Notes

- Playwright tests are **excluded from Vitest on purpose**
- This is **not** a misconfiguration
- Vitest and Playwright must never overlap
- Running Playwright tests via `bun test` will cause failures

If you see Playwright errors while running Vitest, it means the separation has been violated.

---

## VPS / Headless Guidance

Some VPS environments are sensitive to concurrent Vite/Vitest/esbuild runs. To keep builds stable:

- Run **only one** build/test at a time.
- Prefer a real TTY session (avoid background or overlapping runs).
- If a run hangs, stop and capture the error and process list before retrying.

Optional VPS workaround:

```
GOMAXPROCS=1 bun run build
GOMAXPROCS=1 bun run test
```

If `bun run build` hangs, this is a common VPS constraint (kernel/CPU scheduling or sandboxing limits), not a tool defect. Run the build locally or in CI and record the result.

If Chromium sandboxing fails on a headless VPS, run Playwright tests and screenshots on a machine with full browser support.

---

## Mock Usage Audit

All Vitest tests run in `environment: 'node'` (core, cli, web) or `environment: 'happy-dom'` (ui components). Mock usage falls into three justified categories:

**Browser API stubs (unavoidable in node env):**
- `vi.stubGlobal('fetch', ...)` — openai.test.ts (HTTP client testing)
- `vi.stubGlobal('Worker', ...)` — useFlowProcessor.test.ts (Web Worker API)
- `vi.stubGlobal('document', ...)` / `vi.stubGlobal('window', ...)` — useAnnounce.test.ts (DOM access)
- `navigator.clipboard` mock — useClipboard.test.ts, ContextPreview.test.ts

**Unit isolation (standard practice):**
- `vi.mock('@flow-profile/ai', ...)` — useAIStore.test.ts (controls AI client return values)
- `vi.mock('@/composables/useFlowProcessor', ...)` — useFlowStore.test.ts (isolates store from composable)
- `vi.mock('vue', ...)` — useFlowProcessor.test.ts (stubs `onUnmounted` lifecycle)

**Timer control (necessary for debounce testing):**
- `vi.useFakeTimers()` — useIncrementalCompute.test.ts (10 tests testing debounce behavior)

**Console suppression:**
- `vi.spyOn(console, 'warn')` — client.test.ts (suppresses expected warnings)

~22% of tests use some form of mocking. All core pipeline tests (parser, redact, expand, categorize, risks, capabilities, budget, output generators) use zero mocks — they test real implementations against real fixtures.

---

## Current Status

- Runner separation enforced
- Test discovery hardened
- Playwright isolated
- Vitest stable
- Determinism guarantees intact

Status after the v8.2 merge: **stable**
