# CI and Automation Examples

This folder contains ready-to-use examples for running `flow-profile lint` in CI and local automation.

## Contents

- `github-actions.md` - GitHub Actions workflow with SARIF upload
- `gitlab-ci.md` - GitLab CI job with JSON artifact output
- `pre-commit.md` - Simple pre-commit hook for changed flow files

## Notes

- The CLI output formats supported today are `text`, `json`, and `sarif`.
- If the CLI package is not published yet, see the troubleshooting sections for running from the repo source.
