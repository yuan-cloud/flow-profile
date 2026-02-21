# GitHub Actions: Flow Profile Lint

This example runs `flow-profile lint` on pull requests and uploads SARIF results to GitHub Code Scanning.

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

      - uses: oven-sh/setup-bun@v1

      - name: Install Flow Profile CLI
        run: bun install -g @flow-profile/cli

      - name: Lint flows (SARIF)
        run: flow-profile lint ./flows --format sarif --output results.sarif

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: results.sarif
```

## Troubleshooting

- **"flow-profile: command not found"**
  - Ensure the install step completes and the package name matches `@flow-profile/cli`.

- **CLI not published yet**
  - Run from the repo source instead:
    ```bash
    bun install
    bun run --filter @flow-profile/cli build
    node packages/cli/dist/cli.js lint ./flows --format sarif --output results.sarif
    ```

- **No results in Code Scanning**
  - Confirm `Upload SARIF` is running and that your repository has Code Scanning enabled.

## Variations

- To fail the job on high severity findings:
  ```bash
  flow-profile lint ./flows --fail-on high
  ```
