# CI and Automation Examples

This folder contains illustrative examples for running `flow-profile lint` in CI
and local automation. They have not been verified on the hosted CI services.

## Contents

- `github-actions.md` - GitHub Actions workflow saving SARIF as a report artifact
- `gitlab-ci.md` - GitLab CI job with JSON artifact output
- `pre-commit.md` - Simple pre-commit hook for changed flow files

## Notes

- The CLI output formats supported today are `text`, `json`, and `sarif`.
- Default SARIF omits physical source locations. Code Scanning upload/navigation
  compatibility is unverified; see `github-actions.md` for the privacy policy.
- If the CLI package is not published yet, see the troubleshooting sections for running from the repo source.
