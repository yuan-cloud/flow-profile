# GitHub Actions: Flow Profile Lint

This example runs the compiled CLI from a Flow Profile checkout against one flow
file and saves the SARIF report as a workflow artifact. It has not been executed
on GitHub. Adjust the explicit input file for your repository.

Default lint output hides source paths and node IDs. SARIF uses logical input
references in `result.properties.inputRef` and omits physical locations; aliases
must not be treated as repository files. GitHub Code Scanning upload and source
navigation are unverified, so this example does not use `upload-sarif`.

No source-location opt-in is implemented yet. A future explicit CI opt-in must
validate its source root and repository-relative paths, reject paths outside that
root (including symlink escapes), and document that private path names are then
disclosed. Review report content before uploading even a workflow artifact;
heuristic redaction does not certify that arbitrary secrets are removed.

## Example workflow

```yaml
# .github/workflows/flow-lint.yml
name: Flow Profile Lint

on:
  pull_request:
    paths:
      - 'flows/**/*.json'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: '1.3.14'

      - uses: actions/setup-node@v4
        with:
          node-version: '24'

      - name: Build local CLI
        run: |
          bun install --frozen-lockfile --ignore-scripts
          node node_modules/typescript/bin/tsc -p packages/core/tsconfig.json
          node node_modules/typescript/bin/tsc -p packages/cli/tsconfig.json

      - name: Lint flows (SARIF)
        run: node packages/cli/dist/cli.js lint --in flows/flows.json --format sarif --output results.sarif --fail-on error

      - name: Save report artifact
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: flow-lint-report
          path: results.sarif
          if-no-files-found: error
```

## Troubleshooting

- Use the real compiled entry path. The existing CLI entry guard can silently
  exit successfully through a package-bin symlink or a path containing spaces;
  that separate defect remains open. Avoid both cases in this example.
- Directory wildcard handling is also defective at present. Use an explicit
  input file rather than the default directory scan.
- A missing report is an error, not evidence of a clean lint result. Lint errors
  retain safe categories but omit original values and paths.

## Variations

- `--fail-on` accepts configured rule levels (`error`, `warn`, `off`), not severity
  names such as `high`. To fail on warnings as well as errors:
  ```bash
  node packages/cli/dist/cli.js lint --in flows/flows.json --fail-on warn
  ```
