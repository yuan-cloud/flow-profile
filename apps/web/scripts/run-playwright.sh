#!/bin/bash
# Playwright requires Node.js runtime (incompatible with Bun ESM preflight)
# See: docs/decisions/2026-02-05_222846__playwright-bun-e2e-incompatibility.md
cd "$(dirname "$0")/.." || exit 1

NODE_BIN="$(command -v node || command -v nodejs || true)"
if [ -z "$NODE_BIN" ]; then
  echo "Node runtime not found (expected node or nodejs in PATH)" >&2
  exit 127
fi

exec "$NODE_BIN" node_modules/@playwright/test/cli.js "$@" --config playwright.config.ts
