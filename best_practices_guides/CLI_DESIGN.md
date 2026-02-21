# CLI_DESIGN.md

## CLI principles
- Fast, clear, deterministic.
- Exit codes for automation.
- Human-readable logs. Machine-readable JSON outputs.

## Commands
- build. Emit deterministic bundle.
- lint. Emit findings and exit non-zero on thresholds.
- doc. Emit runbook style markdown.

## Output stability
- Stable filenames.
- Stable ordering.
- No timestamps.

## Sensitive data
- Never print unredacted content.
- Provide a --no-redact option only for explicit local-only debugging and warn loudly.
