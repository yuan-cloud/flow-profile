#!/bin/bash
# Playwright requires Node.js runtime (incompatible with Bun ESM preflight)
# See: docs/decisions/2026-02-05_222846__playwright-bun-e2e-incompatibility.md
cd "$(dirname "$0")/.." || exit 1
exec /usr/bin/nodejs node_modules/@playwright/test/cli.js "$@" --config playwright.config.ts
