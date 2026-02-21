# Decision: Playwright E2E runner incompatibility with Bun

## What
Playwright E2E tests fail when executed under Bun due to ESM preflight
generation incompatibility. The error manifests as a missing
`.esm.preflight` file for `playwright.config.ts`.

## Symptoms
- `bun run test:e2e` fails
- Error references:
  `Cannot find module playwright.config.ts.esm.preflight`
- Tests pass when executed under Node.js

## Impact
- Browser E2E tests cannot be reliably executed in the Bun environment
- Accessibility smoke tests (axe-core, keyboard nav) are blocked in CI
- This does NOT affect core, CLI, or unit tests

## Non-Goals
- Do not weaken Vitest/Playwright isolation guarantees
- Do not introduce Node-only dependencies into production code
- Do not re-enable Playwright under `bun test`

## Options Considered
1. Convert `playwright.config.ts` to `.mjs`
2. Run Playwright via a Node wrapper script
3. Pin Playwright to an older version

## Acceptance Criteria
- Playwright E2E tests execute successfully
- Tests remain isolated from Vitest
- No regression to existing test separation
- Solution is documented and reproducible

## Decision: Option 2 - Node Wrapper Script

Implemented `apps/web/scripts/run-playwright.sh`:

```bash
#!/bin/bash
cd "$(dirname "$0")/.." || exit 1
exec /usr/bin/nodejs node_modules/@playwright/test/cli.js "$@" --config playwright.config.ts
```

### Why This Works
- Playwright's ESM preflight generation is incompatible with Bun's module resolution
- Node.js handles the TypeScript config transpilation correctly
- The wrapper is minimal (3 lines) and explicit about the workaround

### Changes Made
1. Added `apps/web/scripts/run-playwright.sh` (wrapper script)
2. Updated `apps/web/package.json` test:e2e to use wrapper
3. Added `testMatch: '**/*.pw.ts'` to playwright.config.ts
4. Installed Node.js 20 system package (`nodejs`)

### Verification
```bash
cd apps/web && bun run test:e2e
# Runs 7 tests via Node.js, bypassing Bun ESM issues
```

## Context
This is pre-existing infrastructure incompatibility discovered during
verification of WCAG 2.1 AA accessibility work (bead 073.14).

Tracked as a separate bead to avoid conflating infra repair with UI work.
