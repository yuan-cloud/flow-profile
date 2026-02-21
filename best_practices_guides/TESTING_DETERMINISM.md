# TESTING_DETERMINISM.md

## Determinism harness
- For each fixture, run build twice and compare bytes.
- Snapshot all outputs.

## Canonical JSON
- Sort keys recursively.
- Stable array ordering.

## Fixtures
- Include at least one fixture with subflows.
- Include at least one fixture with high-entropy secrets.
- Include at least one large flow to validate performance constraints.

## Regression prevention
- If a snapshot changes, document why in docs/decisions.
