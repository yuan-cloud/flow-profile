# Pre-commit Hook: Flow Profile Lint

Use this hook to lint changed flow files before committing.

## Example hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Find changed flow files
FLOWS=$(git diff --cached --name-only --diff-filter=ACM | grep '\.json$' | grep '^flows/')

if [ -n "$FLOWS" ]; then
  echo "Linting flow files..."
  flow-profile lint $FLOWS --fail-on high
fi
```

## Setup

```bash
chmod +x .git/hooks/pre-commit
```

## Troubleshooting

- **"flow-profile: command not found"**
  - Install the CLI globally: `bun install -g @flow-profile/cli`

- **CLI not published yet**
  - Use the repo source instead:
    ```bash
    bun install
    bun run --filter @flow-profile/cli build
    node packages/cli/dist/cli.js lint $FLOWS --fail-on high
    ```
