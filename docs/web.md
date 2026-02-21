# Web App Guide

The web app is a local UI for inspecting Node-RED flow exports. It shows what context would be sent to an assistant after redaction and risk analysis.

![Context preview panel](../apps/web/docs/assets/screenshots/context-preview.png)

## Getting started

```bash
bun run dev
```

Open http://localhost:5173 and drag drop a Node-RED export (`flows.json`).

## UI walkthrough

The UI follows the Flow Profile UX spec in `docs/UX_SPEC.md`:

- Empty state with drop zone and quick explanation.
- Loading state with progress and cancel.
- Parsed view with a three-column layout for summary, context preview, and findings.
- Error state with a readable message and remediation tips.

The three-column layout supports resizable panels for the flow summary and controls columns.

## Working with the flow

Typical flow:

1. Drop a `flows.json` export.
2. Review the summary and token meter.
3. Inspect the context preview and risk findings.
4. Adjust selection and redaction settings as needed.
5. Export or copy the resulting bundle/prompt context.

## Keyboard and accessibility

The UI is designed for keyboard use and accessible navigation:

- Use Tab and Shift+Tab to move between controls.
- Use Enter or Space to activate focused controls.
- Focus states are visible and severity is not conveyed by color alone.

Keyboard shortcuts:

- `Mod+K` open command palette
- `Mod+Shift+C` copy prompt context
- `Mod+Shift+D` download prompt context
- `Mod+Shift+B` download support bundle
- `Mod+Shift+X` reset flow
- `Alt+1` switch to Flow panel
- `Alt+2` switch to Preview panel
- `Alt+3` switch to Controls panel

## Recommended screenshots

The user-facing docs expect screenshots for key states. Capture and place images in a `docs/assets/screenshots/` folder if you add them:

- Empty state
- Parsed view (three columns)
- Risk findings expanded
- Export options

Optional automation (run on a machine that can launch Chromium):

```bash
DOCS_CAPTURE=1 DOCS_CAPTURE_URL=http://127.0.0.1:5173 bun run test:e2e -- --config playwright.docs.config.ts --project=chromium -g "docs capture"
```
