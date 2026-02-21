# End-to-End Pipeline Validation Checklist (M1 -> M2 -> M3)

Purpose: validate that core bundle outputs, web worker/UI rendering, and CLI lint outputs stay aligned on the same fixture inputs.

Scope
- CLI build outputs: about-my-flows.json, prompt-context.md, risk-findings.json, capability-manifest.json, bundle-manifest.json, support-bundle.zip
- Web worker build result: aboutMyFlows, promptContext, riskFindings, capabilityManifest, tokenEstimate
- CLI lint outputs: text, json, sarif (CI-ready formats)

Fixtures
- testdata/fixtures/simple.json
- testdata/fixtures/risk-triggers.json
- testdata/fixtures/capability-surface.json
- testdata/fixtures/with-subflows.json
- testdata/fixtures/large-500-nodes.json

Current status (2026-02-02)
- CLI build succeeds (`bun run --cwd packages/cli build`).
- CLI lint JSON output fails with `Lint failed: Cannot canonicalize circular structure` when run against `risk-triggers.json` (no JSON file produced).
- CLI lint SARIF output succeeds.
- Web DropZone imports raw Node-RED flow JSON only (does not accept support-bundle.zip).

CLI build smoke steps
1) Build CLI (if needed):
   - `bun run --cwd packages/cli build`
2) Run build:
   - `bun packages/cli/dist/cli.js build --in testdata/fixtures/simple.json --out-dir /tmp/flow-profile-n7p-simple`
3) Confirm the 6 artifacts exist in the output dir.
4) Repeat with `risk-triggers.json`, `capability-surface.json`, `with-subflows.json`, `large-500-nodes.json`.
5) Do not commit output files.

CLI lint output steps
1) Text:
   - `bun packages/cli/dist/cli.js lint --in testdata/fixtures/risk-triggers.json --format text`
2) JSON:
   - `bun packages/cli/dist/cli.js lint --in testdata/fixtures/risk-triggers.json --format json --output /tmp/flow-profile-n7p-lint.json`
3) SARIF:
   - `bun packages/cli/dist/cli.js lint --in testdata/fixtures/risk-triggers.json --format sarif --output /tmp/flow-profile-n7p-lint.sarif`
4) Confirm outputs are valid JSON and include findings.

Web worker smoke steps (manual)
1) Start the web app and load the same fixture JSON (drag-drop `testdata/fixtures/*.json`).
2) Ensure the worker completes without error and returns a BuildResult.
3) Confirm that the UI displays:
   - summary counts (tabs/nodes/edges/subflows/config nodes)
   - token estimate status
   - risk findings count > 0 for `risk-triggers.json`
   - capability panel populated for `capability-surface.json`
4) For `with-subflows.json`, ensure expanded counts are non-zero and the UI does not error.
5) For `large-500-nodes.json`, ensure UI remains responsive.

Alignment checks (CLI vs worker)
- about-my-flows summary counts match worker summary for the same fixture.
- risk-findings count and rule IDs align for `risk-triggers.json`.
- capability-manifest metadata totals match worker capability metadata.
- prompt-context header lines match the worker summary lines.
- bundle-manifest artifact hashes align with CLI artifact contents.

Failure capture
- Record any mismatch with:
  - fixture name
  - CLI artifact field
  - worker field
  - observed vs expected values
  - suggested owner (core, cli, or web)
