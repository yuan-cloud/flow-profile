#!/bin/bash
# Playwright requires Node.js runtime (incompatible with Bun ESM preflight)
# See: docs/decisions/2026-02-05_222846__playwright-bun-e2e-incompatibility.md
cd "$(dirname "$0")/.." || exit 1

NODE_BIN="$(command -v node || command -v nodejs || true)"
if [ -z "$NODE_BIN" ]; then
  echo "Node runtime not found (expected node or nodejs in PATH)" >&2
  exit 127
fi

CLI_PATH=""
for candidate in \
  "node_modules/@playwright/test/cli.js" \
  "../../node_modules/@playwright/test/cli.js"; do
  if [ -f "$candidate" ]; then
    CLI_PATH="$candidate"
    break
  fi
done

if [ -z "$CLI_PATH" ]; then
  echo "Playwright CLI not found in apps/web or workspace root node_modules" >&2
  exit 127
fi

exec "$NODE_BIN" "$CLI_PATH" "$@" --config playwright.config.ts
