# @flow-profile/cli

Command-line interface for Flow Profile. Wraps `@flow-profile/core` with file system access, output writing, and structured reporting.

## Install

```bash
bun add @flow-profile/cli
```

The CLI binary is available as `flow-profile` after installation.

## Commands

### `flow-profile build`

Build a deterministic support bundle from a Node-RED flow export.

```bash
flow-profile build <input.json> [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--out <dir>` | Output directory (default: `./out`) |
| `--no-redact` | Disable secret redaction (warns on stderr) |
| `--strict` | Enable strict redaction mode |
| `--entropy <n>` | Entropy threshold for secret detection (default: 4.5) |
| `--budget <n>` | Token budget for prompt context (default: 8000) |
| `--json` | Print result as JSON to stdout |
| `--quiet` | Suppress informational output |

**Output artifacts:**
- `about-my-flows.json` — Structured flow metadata
- `capability-manifest.json` — Tools and resources manifest
- `prompt-context.md` — AI-ready markdown context
- `risk-findings.json` — Static analysis results
- `support-bundle.zip` — All artifacts in a single ZIP

**Example:**

```bash
flow-profile build flows.json --out ./bundle --budget 12000
```

### `flow-profile lint`

Run static risk detection on a Node-RED flow export.

```bash
flow-profile lint <input.json> [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--format <fmt>` | Output format: `text`, `json`, or `sarif` |
| `--fail-on <level>` | Exit non-zero on findings at this level or above |
| `--config <path>` | Path to lint configuration file |
| `--output <path>` | Write report to file instead of stdout |
| `--quiet` | Suppress informational output |

**Example:**

```bash
flow-profile lint flows.json --format sarif --output report.sarif
flow-profile lint flows.json --fail-on warning
```

### `flow-profile doc`

Generate runbook documentation or flow diffs.

```bash
flow-profile doc <input.json> [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--out <path>` | Output file path |
| `--diff <path>` | Compare against another flow file |
| `--quiet` | Suppress informational output |

**Example:**

```bash
flow-profile doc flows.json --out runbook.md
flow-profile doc flows.json --diff previous.json --out changes.md
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success (or lint passed) |
| `1` | General error (parse failure, missing file, unknown command) |
| `2+` | Lint findings exceeded `--fail-on` threshold |

## Programmatic Usage

The CLI commands are also available as library functions:

```ts
import { runBuildCommand, parseBuildArgs } from '@flow-profile/cli';
import { runLintCommand, parseLintArgs, computeLintExitCode } from '@flow-profile/cli';
import { runDocCommand, parseDocArgs } from '@flow-profile/cli';
```

## Build

```bash
bun run build
bun run typecheck
bun run test
```
