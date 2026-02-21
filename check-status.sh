#!/bin/bash
# Quick status check for all agents

echo "=== PROJECT STATUS ==="
echo "Directory: $(pwd)"
echo ""

echo "=== RECENT COMMITS ==="
git log --oneline -5
echo ""

echo "=== CURRENT BEADS STATUS ==="
bd stats
echo ""

echo "=== ACTIVE AGENTS ==="
# This would need Agent Mail integration

echo "=== CODE STRUCTURE ==="
echo "Core modules created:"
ls -la packages/core/src/
echo ""

echo "=== TESTS ==="
if [ -f "package.json" ]; then
  echo "Running tests..."
  bun run test 2>/dev/null || echo "No tests configured yet"
else
  echo "No package.json found"
fi