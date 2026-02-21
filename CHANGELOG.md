# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Core pipeline**: Parse, redact, expand, categorize, detect risks, extract capabilities, and generate outputs from Node-RED flow JSON.
- **Redaction engine**: Entropy-based and pattern-based secret detection with configurable thresholds and strict mode.
- **Risk detection**: Static analysis rules for injection-prone templates, infinite loops, high-entropy values, and missing error handlers.
- **Capability extraction**: Identify tools (exec, file-write) and resources (HTTP endpoints, MQTT topics) in flows.
- **Token budgeting**: Estimate prompt token usage with per-section breakdown and budget status tracking.
- **Smart collapse**: Shorten function code to fit token budgets while preserving key logic.
- **Subflow expansion**: Replace subflow instance nodes with their internal graphs for full analysis.
- **Output generators**: about-my-flows.json, capability-manifest.json, prompt-context.md, risk-findings.json, support-bundle.zip.
- **Flow diff**: Structured comparison between two parsed flows.
- **Zod schemas**: Validation schemas for Node-RED flow JSON.
- **CLI**: `flow-profile build`, `flow-profile lint` (text/JSON/SARIF output), `flow-profile doc` commands.
- **Vue 3 web app**: Context builder UI with drag-and-drop flow upload, real-time preview, and artifact export.
- **Web Worker**: Off-thread flow processing to keep the UI responsive.
- **Pinia stores**: Flow state, AI configuration, and app UI state management.
- **AI adapters**: Vendor-agnostic interface with OpenAI and mock implementations.
- **Design system**: Foundation tokens (colors, spacing, typography, animations) and component library.
- **UI components**: ContextPreview, TokenMeter, RedactionPanel, FlowTree, RiskCard, CapabilityCard, CapabilityPanel, CollapsibleSection, DiffViewer, MarkdownRenderer, ProgressBar.
- **Composables**: useClipboard, useVirtualScroll, useFlowProcessor, useIncrementalCompute, useStatusCards, useAnnounce.
- **Button variant system**: Padding, hover scale, and rose danger variant.
- **Form input polish**: Custom slider styling, focus transitions, spin button removal.
- **Collapsible transitions**: Smooth height animations with SVG chevrons.
- **Copy/download microinteractions**: Success feedback on export actions.
- **Accessibility baseline**: WCAG 2.1 AA compliance, aria-labels, focus management, text contrast.
- **E2E testing**: Playwright infrastructure with data-testid selectors.
- **Unit tests**: Comprehensive coverage across core, ai, ui, and web packages (400+ tests).
- **Integration tests**: Cross-package pipeline tests covering all 6 fixture flows.
- **Coverage enforcement**: Istanbul provider with per-package thresholds.
- **Test data factory**: Shared factory system for generating test fixtures.
- **Documentation**: Package READMEs, testing guide, security policy, contributing guide, code of conduct, MIT license.

### Fixed

- Flaky E2E selectors replaced with data-testid attributes.
- Circular subflow detection prevents infinite expansion.
- Stale clipboard timer cleared on re-click.
- Tab focus prevented from entering collapsed sections.
- Webkit slider thumb vertical centering.
- Lint JSON output sanitization.
