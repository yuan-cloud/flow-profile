# PERFORMANCE_WORKERS.md

## Rule
Never parse large flows on the main thread in the browser.

## Worker responsibilities
- Parse input JSON and validate.
- Build graph, expand subflows, redact, analyze risks, infer capabilities.
- Return a compact result payload for UI rendering.

## UI responsibilities
- Render.
- Handle selection and toggles.
- Request recompute from worker only when needed.

## Progressive feedback
- Post progress messages.
- Support cancellation.
