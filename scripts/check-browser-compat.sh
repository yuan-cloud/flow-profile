#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="$ROOT_DIR/packages/core/src"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "ERROR: Expected core source at $TARGET_DIR" >&2
  exit 1
fi

PATTERNS=(
  "from\\s+['\"]node:"
  "require\\(['\"]node:"
  "from\\s+['\"](fs|path|os|child_process|crypto|http|https|net|tls|dgram|stream|buffer|events|util|process|worker_threads)['\"]"
  "require\\(['\"](fs|path|os|child_process|crypto|http|https|net|tls|dgram|stream|buffer|events|util|process|worker_threads)['\"]"
  "\\bBun\\."
)

for pattern in "${PATTERNS[@]}"; do
  if rg -n \
    --glob "*.ts" \
    --glob "*.tsx" \
    --glob "*.js" \
    --glob "*.jsx" \
    --glob "!**/*.test.ts" \
    --glob "!**/*.test.tsx" \
    --glob "!**/*.spec.ts" \
    --glob "!**/*.spec.tsx" \
    -e "$pattern" \
    "$TARGET_DIR"; then
    echo "ERROR: packages/core must remain browser-compatible. Remove Node.js/Bun usage." >&2
    exit 1
  fi
done

echo "OK: packages/core is free of Node.js/Bun imports."
