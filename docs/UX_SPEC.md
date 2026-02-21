# UX_SPEC.md. Flow Profile Context Builder

## Goal
Make it obvious and safe for a flow author to answer one question:
What exactly will the assistant see, and what can it do with it.

## Primary user path
1. Drag drop flows.json.
2. See summary, token meter, context preview, risks, and capabilities immediately.
3. Adjust selection, redaction, and collapse.
4. Export bundle or copy prompt context.

## UI states

### Empty
- Show drop zone and short explanation.
- Provide a link to sample fixtures for demo.

### Loading
- Show progress indicator.
- Allow cancel.
- Do not freeze the UI.

### Parsed
- Show three-column layout.
- Default selection should be conservative but useful:
  - Flatten subflows on.
  - Redaction on, strict mode.
  - Function code smart collapsed.

### Error
- Show a readable error.
- Suggest common fixes, for example wrong export format.

## Risk language
- Use review recommended framing.
- Provide evidence and remediation.
- Provide confidence level.

## Capability inspector language
- Tools. Actions the assistant could call.
- Resources. Data the assistant could read.
- Label uncertainty. Inferred vs explicit.

## Accessibility baseline
- Keyboard navigation for tree and risk list.
- Visible focus states.
- Controls have labels.
- Do not rely on color only for severity or budget states.
