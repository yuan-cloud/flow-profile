# Flow Profile Demo Script (5 minutes)

## Audience
Product, platform, and security engineers who need deterministic, shareable flow context.

## Setup (before demo)
- Clean browser profile
- Dark mode off
- Window 1280x800 or larger
- Preload sample flows:
  - `testdata/demo/demo-simple.json`
  - `testdata/demo/demo-complex.json`
  - `testdata/demo/demo-api.json`

## Narrative Arc (5 minutes)

### 1) Problem (0:00 - 0:30)
**Say:**
- "We all have complex Node-RED flows. When we ask for help, what do we send to an AI assistant?"
- "And how do we know we didn't leak secrets or context we shouldn't share?"

**Show:**
- A complex flow file in the file picker.

### 2) Solution Intro (0:30 - 1:00)
**Say:**
- "Flow Profile gives a deterministic, redaction-first bundle you can review before sharing."

**Do:**
- Drop `demo-simple.json` into the app.

### 3) Core Features (1:00 - 3:00)
**Context preview**
- "This is exactly what the AI would see. Nothing hidden, nothing guessed."

**Token meter**
- "We show a token estimate so you know your budget before you send anything."

**Redaction**
- "Secrets are detected by field names and entropy checks. Same input always yields the same masks."

**Risk findings**
- "These are patterns worth reviewing, not vulnerabilities. Evidence and remediation included."

**Capabilities**
- "MCP-inspired: what the flow could DO vs what it could READ. Uncertainty is labeled."

### 4) Workflow Demo (3:00 - 4:00)
**Do:**
- Switch to `demo-complex.json`.
- Toggle collapse settings.
- Show token count drop.
- Copy context.
- Export bundle.

**Say:**
- "Everything is deterministic. Run it twice, you get byte-identical outputs."

### 5) Value Prop (4:00 - 5:00)
**Say:**
- "Works without AI."
- "Deterministic outputs for audit and repeatability."
- "CLI for automation and CI."

## Talking Points (quick references)

**Redaction**
- "Secrets are detected using field names and entropy analysis. Same input, same masks."

**Risks**
- "Not vulnerabilities. They're patterns worth reviewing with evidence and remediation."

**Capabilities**
- "Tools vs resources. What the AI can do vs what it can read."

**Determinism**
- "Identical input yields identical output. This is essential for trust and review."

## Demo Checklist
- [ ] Load `demo-simple.json`
- [ ] Confirm redactions
- [ ] Review risks and capabilities
- [ ] Load `demo-complex.json`
- [ ] Toggle collapse, watch token count
- [ ] Export bundle
- [ ] Finish in under 5 minutes
