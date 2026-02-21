# Cross-Component Quality Validation Checklist

Purpose: validate that quality gates and data flow remain consistent across CLI and web components as milestones complete.

Scope
- CLI build outputs: about-my-flows.json, prompt-context.md, risk-findings.json, capability-manifest.json
- Web worker build result: aboutMyFlows, promptContext, riskFindings, capabilityManifest, tokenEstimate
- Quality gates: UBS, lint, test, build (repo-wide failures may exist; document if pre-existing)

Fixtures
- testdata/fixtures/simple.json
- testdata/fixtures/risk-triggers.json
- testdata/fixtures/capability-surface.json
- testdata/fixtures/with-subflows.json

Quality gate check
1) Run `ubs --staged` before commit (must be clean).
2) Run `bun run lint` and record any repo-wide existing failures.
3) Run `bun run test` and record timeout/failure if pre-existing.
4) Run `bun run build` and record module-resolution issues if pre-existing.

CLI build smoke steps
1) Run:
   - `flow-profile build --in testdata/fixtures/simple.json --out-dir ./out`
2) Confirm the 5 artifacts exist in `./out`.
3) Repeat with `risk-triggers.json` and `capability-surface.json`.
4) Do not commit `./out` files (generated output).

Web worker smoke steps (manual)
1) Start the web app and load the same fixture JSON.
2) Ensure the worker completes without error and returns a BuildResult.
3) Confirm the UI displays:
   - summary counts (tabs/nodes/edges/subflows/config nodes)
   - token estimate status
   - risk findings count > 0 for `risk-triggers.json`
   - capability panel populated for `capability-surface.json`
4) For `with-subflows.json`, ensure expanded counts are non-zero and the UI does not error.

Alignment checks (CLI vs worker)
- about-my-flows summary counts match worker summary for the same fixture.
- risk-findings count and rule IDs align for `risk-triggers.json`.
- capability-manifest metadata totals match worker capability metadata.
- prompt-context header lines match the worker summary lines.

Failure capture
- Record any mismatch with:
  - fixture name
  - CLI artifact field
  - worker field
  - observed vs expected values
  - suggested owner (core, cli, or web)

