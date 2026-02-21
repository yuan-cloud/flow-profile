# GitLab CI: Flow Profile Lint

This example runs `flow-profile lint` and stores the output as a build artifact.

## Example `.gitlab-ci.yml`

```yaml
flow-lint:
  stage: test
  image: oven/bun:latest
  script:
    - bun install -g @flow-profile/cli
    - flow-profile lint ./flows --format json --output flow-profile-report.json
  artifacts:
    paths:
      - flow-profile-report.json
  rules:
    - changes:
        - flows/**/*.json
```

## Troubleshooting

- **"flow-profile: command not found"**
  - Verify the install step and package name `@flow-profile/cli`.

- **CLI not published yet**
  - Run from the repo source instead:
    ```bash
    bun install
    bun run --filter @flow-profile/cli build
    node packages/cli/dist/cli.js lint ./flows --format json --output flow-profile-report.json
    ```

- **Need GitLab Code Quality integration**
  - The `flow-profile` JSON output is a project-specific format.
  - If you need GitLab Code Quality, add a conversion step in CI or keep the JSON artifact for review.
