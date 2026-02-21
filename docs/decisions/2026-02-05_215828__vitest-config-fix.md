# Bead: Fix vitest.config.ts syntax error blocking lint/test

## What
Root vitest.config.ts contains invalid syntax: an import statement appears inside the exclude array, breaking parsing.

## Impact
- bun run lint fails
- bun run test fails

## Acceptance Criteria
- vitest.config.ts parses correctly
- bun run lint executes without syntax errors
- bun run test executes (excluding Playwright isolation work)

## Notes
This is pre-existing infra debt discovered during 073.14 verification.
