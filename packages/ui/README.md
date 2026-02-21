# @flow-profile/ui

Reusable Vue 3 components for Flow Profile. All components accept data via props and emit events for changes — no internal state management or API calls.

## Install

```bash
bun add @flow-profile/ui
```

**Peer dependency:** Vue 3.4+

## Components

### ContextPreview

Renders the AI-ready prompt context markdown with optional diff view against a previous version.

```vue
<ContextPreview
  :content="promptContext"
  :previous-content="previousContext"
  v-model:show-diff="showDiff"
  @copy="handleCopy"
/>
```

### TokenMeter

Visualizes token usage against a configurable budget with per-section breakdown.

```vue
<TokenMeter
  :current="tokenCount"
  :budget="tokenBudget"
  :breakdown="{ summary: 120, nodeDescriptions: 800, functionCode: 1200, riskFindings: 280 }"
  @update:budget="tokenBudget = $event"
  @select-breakdown="handleBreakdown"
/>
```

### RedactionPanel

Controls for redaction settings: enable/disable, strict mode toggle, and entropy threshold slider.

```vue
<RedactionPanel
  :enabled="options.redactionEnabled"
  :strict-mode="options.strictMode"
  :threshold="options.entropyThreshold"
  :redactions="redactionReport"
  @update:enabled="options.redactionEnabled = $event"
  @update:strict-mode="options.strictMode = $event"
  @update:threshold="options.entropyThreshold = $event"
/>
```

### FlowTree

Hierarchical tree visualization of flow tabs, nodes, and edges.

```vue
<FlowTree :tabs="flowTreeTabs" @select-node="handleNodeSelect" />
```

**Exported types:** `FlowTreeNode`, `FlowTreeTab`

### RiskCard

Displays a single risk finding with severity badge and affected node reference.

```vue
<RiskCard
  title="Secrets detected"
  description="Potential API token found."
  severity="high"
  node-id="node-123"
  @select="handleSelect"
/>
```

### CapabilityCard

Shows a single capability (tool or resource) extracted from the flow.

```vue
<CapabilityCard :name="cap.name" :description="cap.description" :type="cap.type" />
```

### CapabilityPanel

Panel wrapper that groups and displays all extracted capabilities.

```vue
<CapabilityPanel :tools="manifest.tools" :resources="manifest.resources" />
```

### CollapsibleSection

Expandable/collapsible content section with customizable header.

```vue
<CollapsibleSection title="Advanced Options" :initially-open="false">
  <slot />
</CollapsibleSection>
```

### DiffViewer

Side-by-side or inline diff display for comparing flow versions.

```vue
<DiffViewer :before="oldContent" :after="newContent" />
```

### MarkdownRenderer

Renders markdown content with Prism.js syntax highlighting for code blocks.

```vue
<MarkdownRenderer :content="markdownString" />
```

### ProgressBar

Configurable progress indicator.

```vue
<ProgressBar :value="progress" :max="100" />
```

## Composables

### useClipboard

Clipboard write utility with success/error state tracking.

```ts
import { useClipboard } from '@flow-profile/ui';

const { copy, copied, error } = useClipboard();
await copy('text to copy');
```

### useVirtualScroll

Virtual scrolling for large lists — renders only visible items.

```ts
import { useVirtualScroll } from '@flow-profile/ui';

const { visibleItems, containerProps, wrapperProps } = useVirtualScroll({
  items,
  itemHeight: 32,
  containerHeight: 400,
});
```

## Theming

Components use CSS custom properties from the Flow Profile design system (`--fp-*` tokens). Override these properties to customize appearance:

```css
:root {
  --fp-accent-primary: #10b981;
  --fp-surface-base: #0f172a;
  --fp-text-primary: #e2e8f0;
  --fp-border-focus: #38bdf8;
}
```

## Build

```bash
bun run build
bun run typecheck
bun run test
```
