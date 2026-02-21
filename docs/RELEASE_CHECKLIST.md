# Release Checklist

Use this checklist to validate a release-ready state.

## Required checks

- `bun run lint`
- `bun run test`
- `bun run build` (run on a local workstation or CI if VPS builds hang; this is a common VPS constraint, not a tool defect)
- `bun run --cwd apps/web test:e2e`

## Docs capture

- `DOCS_CAPTURE=1 DOCS_CAPTURE_URL=http://127.0.0.1:5173 bun run test:e2e -- --config playwright.docs.config.ts --project=chromium -g "docs capture"`

## Repo hygiene

- `git status -sb` is clean
- All changes committed and pushed

## Notes

- If VPS builds hang, use CI or a local workstation as the source of truth; this is a common VPS constraint, not a tool defect.
