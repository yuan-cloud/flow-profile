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

## Input resource limits

Flow input files must be regular files (a symlink to a regular file is accepted).
The CLI reads at most 32 MiB plus one refusal-detection byte, counts actual bytes
rather than trusting file-size metadata, and closes the input on failure. `lint`
shares 32 MiB across its input files and accepts at most 128 files; `doc --diff`
shares that budget across both inputs. A lint configuration has its own 32 MiB cap.

The shared core preflight allows at most 50,000 elements in any array, 64 nested
containers, and 2,000,000 structural units across an input, including custom
metadata. Structural units count opening brackets/braces, commas and colons
outside strings. Byte, depth and structural checks run before `JSON.parse`;
the structural-unit budget is shared across lint inputs and across a doc diff's
two inputs, while a configuration has its own budget. Splitting an input does not
raise these aggregate limits.
Decoded-array and aggregate-text checks run before validation or redaction.
Already parsed core inputs have the same container/work limits and an aggregate
33,554,432 UTF-16 code-unit text budget, including keys. Accessors are rejected without
evaluating their values; cyclic data eventually reaches the depth/work limit.
These APIs expect JSON-shaped data, not arbitrary JavaScript objects or proxies.

The runtime dependency is pinned to patched Zod 4.6.6. Bounded schema arrays use
its early size check and stop validation at the first invalid element, retaining
at most 16 issues per array failure. Invalid-input diagnostics therefore no longer
enumerate every failing element. Valid data, custom fields and flow relationships
remain supported within the limits. Capacity depends on fields and topology:
verified CLI fixtures include 40,000 default-shaped function nodes in 1,000 tabs
(1,291,000 structural units). Richer metadata and different graph shapes can hit
input or downstream analysis limits. The web uploader retains its separate 5 MiB cap.

CLI resource refusals return exit 1; lint uses the fixed `input-limit` diagnostic
category without input excerpts or paths. A resource refusal is not a successful
lint result and is independent of `--fail-on`.

Input bounds are defense in depth, not a substitute for the patched dependency
or a general process-memory ceiling. Redaction, expansion, risk presentation and
report generation can still amplify accepted inputs; many shorter recognized
values remain a documented matcher-memory limit. Review exports before sharing.

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

Lint detects risks on the original input. Only source-derived display values
are sanitized while findings are composed; public rule wording is preserved.
The same presentation is used for text, JSON and SARIF. Detection settings, finding counts and
fail-on behavior are preserved. Output masks recognized source secret values
(including repeated aliases), eligible high-entropy tokens and keys in finding
data. Each whitespace-delimited run is checked for entropy before it is split at
quotes, backticks or angle brackets, covering recognized symbol-rich and Unicode
tokens containing those characters. Structured field paths are rendered one
component at a time: every component is checked, including camelCase keys. Only
exact public sensitive field names (such as `password`) are exempt. Harmless labels
and below-threshold path components remain readable where possible. Output privacy always uses
the default redactor settings, independently of the entropy detection settings.

Known node-type literals used as unnamed-node fallbacks remain public vocabulary, just as
they do in rule descriptions and output-type lists. Their spelling is independent
of sensitive values, including when a node ID happens to equal its type. An explicit
private label matching that type is masked wholly if sanitization would change it,
so a partial mask cannot be compared against the public type elsewhere.

Node identifiers become stable report-local `node-N` references, and input file
paths become ordered logical `urn:flow-profile:input:N` references. These are
report metadata, not filenames or physical SARIF locations. File references follow
the input collection order (directory entries use locale-based sorting), consistently
across JSON and SARIF; reports omit the original path mapping. Node references are
consistent within a report and should be interpreted with the input reference.
Output-file notices omit the
requested path. Argument and failure diagnostics omit caller values and raw
exception details, which can contain input excerpts, keys or filesystem paths.
They retain fixed categories for argument, configuration, read, JSON, schema, rule,
directory-pattern, write and internal failures.

This remains heuristic redaction, not certification that an export is safe.
Unknown low-entropy prose, transformed/encoded secrets and code literals may
remain, including unrecognized object keys. Recognized short values can also mask
parts of harmless source labels and keys; surrounding source context can reveal
or suggest the short value. Public rule text, public type literals, exact public field names and fixed mask/reference
syntax can coincidentally equal a credential value; their presence does not identify
that value as a source credential. Review before
sharing. Direct formatter calls without original-input context cannot discover
field-name-based secrets or their low-entropy aliases from the flow. This policy
does not change the privacy behavior of other commands.

Recognition follows the default redactor's string handling. Numeric credentials,
environment-style `name`/`value` pairs and unrecognized children of credential
objects can remain. Alias matching is exact: case changes and Unicode normalization
variants can evade it. Short IDs occurring as ordinary prose are ambiguous; their
structural identifier slots are aliased, while ordinary words and numbers in labels
are retained unless recognized as secrets. Entropy alone also misses tokens below
its threshold, even when they resemble encoded credentials.

Recognized values longer than 1,024 UTF-16 code units are matched as literal
substrings without allocating a trie state per character. A match masks the whole
display value. This avoids the reproduced single-long-value memory amplification;
total memory still depends on input size, the number of shorter recognized values
and report size. It is not a general resource bound for arbitrary flows.

SARIF includes sanitized remediation guidance in `result.properties.remediation`;
it does not advertise prose-only guidance as an executable `fix`.
Default SARIF omits physical `locations` to avoid disclosing or misattributing
source files. Logical input references live in `result.properties.inputRef`.
GitHub Code Scanning upload/navigation compatibility is unverified. There is no CI
source-location opt-in in this version. A future opt-in must validate a source root
and repository-relative paths, and explain that paths may disclose private names.

```bash
flow-profile lint --in ./flows.json
flow-profile lint --in ./flows.json --format sarif --output ./lint.sarif
```

Directory wildcard handling has a known defect; default `**/*.json` may fail before
analysis. Use explicit file inputs until directory-glob behavior is repaired.

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
