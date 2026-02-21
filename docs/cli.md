# CLI Reference

Flow Profile ships a CLI with three commands: `build`, `lint`, and `doc`.

## Command overview

```bash
flow-profile build --in <flow.json> [options]
flow-profile lint --in <flow.json|dir> [options]
flow-profile doc --in <flow.json> --out <file> [options]
```

If you have not installed a global CLI, run the compiled binary directly:

```bash
bun run --cwd packages/cli build
node packages/cli/dist/cli.js build --in ./flows.json --out-dir ./out
```

## build

Builds a deterministic support bundle plus supporting artifacts.

```bash
flow-profile build --in ./flows.json --out-dir ./out
```

Outputs:

- `about-my-flows.json`
- `capability-manifest.json`
- `prompt-context.md`
- `risk-findings.json`
- `bundle-manifest.json`
- `support-bundle.zip`

Options (from `flow-profile build --help`):

- `--in <path>` Input flow JSON file (required)
- `--out-dir <dir>` Output directory (default: `out`)
- `-o, --out <dir>` Alias for `--out-dir`
- `--redact` Enable redaction (default)
- `--no-redact` Disable redaction (prints warning)
- `--strict` Enable entropy scanning (default)
- `--no-strict` Disable entropy-based redaction
- `--flatten` Expand subflows (default)
- `--no-flatten` Do not expand subflows
- `--entropy <value>` Entropy threshold override
- `--json` Emit machine-readable JSON summary
- `--quiet` Suppress non-error output
- `-h, --help` Show help

## lint

Runs static risk detection against one or more flow exports.

```bash
flow-profile lint --in ./flows.json
flow-profile lint --in ./flows --format sarif --output ./lint.sarif
```

Options:

- `--in <path>` Input flow JSON file or directory (required)
- `--config <path>` Path to `.flowprofilerc.json`
- `--only <ruleIds>` Comma-separated rule IDs to run
- `--skip <ruleIds>` Comma-separated rule IDs to skip
- `--fail-on <level>` Exit non-zero on `error` or `warn` findings (default: `error`)
- `--format <format>` Output format: `text|json|sarif` (default: `text`)
- `--output <path>` Write report to file instead of stdout
- `--json` Alias for `--format json`
- `--include <globs>` Comma-separated glob patterns (default: `**/*.json`)
- `--exclude <globs>` Comma-separated glob patterns to exclude
- `--quiet` Suppress non-error output
- `-h, --help` Show help

Exit codes:

- `0` No findings above the `--fail-on` threshold
- `2` Findings at or above the `--fail-on` threshold
- `1` CLI or input errors

## doc

Generates runbook documentation or a diff report between two flows.

```bash
flow-profile doc --in ./flows.json --out ./runbook.md
flow-profile doc --in ./after.json --diff ./before.json --out ./changes.md
flow-profile doc --in ./flows.json --out ./runbook.html --format html
```

Options:

- `--in <path>` Input flow JSON file (required)
- `--diff <path>` Diff against another flow JSON file
- `--out <path>` Output file (required)
- `--format <type>` Output format: `markdown` (default) or `html`
- `--include-code` Include function node source code
- `--title <string>` Document title (default: `Flow Documentation`)
- `--author <string>` Author name for header
- `--quiet` Suppress non-error output
- `-h, --help` Show help
