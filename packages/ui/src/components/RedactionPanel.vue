<template>
  <section class="redaction-panel" :data-disabled="warningVisible && !pendingDisable">
    <header class="redaction-panel__header">
      <div>
        <p class="redaction-panel__title">Redaction Settings</p>
        <p class="redaction-panel__subtitle">Control how secrets are detected and masked.</p>
      </div>
      <span class="redaction-panel__badge" :data-status="statusLabel">{{ statusText }}</span>
    </header>

    <div class="redaction-panel__controls">
      <label class="redaction-panel__toggle">
        <input
          class="redaction-panel__checkbox"
          type="checkbox"
          :checked="displayEnabled"
          @change="handleEnabledToggle"
        />
        <span class="redaction-panel__toggle-text">Enable redaction (recommended)</span>
      </label>

      <label class="redaction-panel__toggle">
        <input
          class="redaction-panel__checkbox"
          type="checkbox"
          :checked="props.strictMode"
          :disabled="!displayEnabled"
          @change="handleStrictToggle"
        />
        <span class="redaction-panel__toggle-text">Strict mode (entropy scanning)</span>
      </label>

      <div class="redaction-panel__threshold">
        <div class="redaction-panel__threshold-header">
          <div class="redaction-panel__threshold-label-group">
            <span id="entropy-threshold-label" class="redaction-panel__threshold-label">Entropy threshold</span>
            <FpTooltip text="Lower values catch more secrets but can increase false positives. Higher values are more conservative." />
          </div>
          <input
            v-model="thresholdInput"
            class="redaction-panel__threshold-input"
            type="number"
            min="3"
            max="6"
            step="0.1"
            :disabled="!displayEnabled"
            aria-labelledby="entropy-threshold-label"
            aria-describedby="entropy-threshold-help"
            @blur="handleThresholdCommit"
            @keyup.enter="handleThresholdCommit"
          />
        </div>
        <input
          class="redaction-panel__slider"
          type="range"
          min="3"
          max="6"
          step="0.1"
          :value="thresholdValue"
          :disabled="!displayEnabled"
          aria-labelledby="entropy-threshold-label"
          aria-describedby="entropy-threshold-help"
          @input="handleThresholdInput"
        />
        <p id="entropy-threshold-help" class="redaction-panel__threshold-help">Lower = more aggressive, higher = fewer false positives.</p>
      </div>
    </div>

    <div v-if="warningVisible" class="redaction-panel__warning" :data-confirm="pendingDisable">
      <p class="redaction-panel__warning-title">WARNING: Redaction disabled</p>
      <p class="redaction-panel__warning-text">
        Your flow may contain secrets. Do not share the output or send it to AI assistants.
      </p>
      <div class="redaction-panel__warning-actions">
        <button
          v-if="pendingDisable"
          class="redaction-panel__warning-button"
          type="button"
          @click="confirmDisable"
        >
          I understand, disable anyway
        </button>
        <button
          v-if="pendingDisable"
          class="redaction-panel__warning-button redaction-panel__warning-button--ghost"
          type="button"
          @click="cancelDisable"
        >
          Keep redaction enabled
        </button>
        <button
          v-if="!pendingDisable"
          class="redaction-panel__warning-button"
          type="button"
          @click="enableRedaction"
        >
          Re-enable redaction
        </button>
      </div>
    </div>

    <div class="redaction-panel__report">
      <header class="redaction-panel__report-header">
        <p class="redaction-panel__report-title">Redaction Report</p>
        <span class="redaction-panel__report-count">{{ reportCount }} items</span>
      </header>
      <ul v-if="reportItems.length" class="redaction-panel__report-list">
        <li v-for="entry in reportItems" :key="entryKey(entry)" class="redaction-panel__report-item">
          <span class="redaction-panel__report-path">{{ entry.fieldPath || 'unknown' }}</span>
          <span class="redaction-panel__report-mask">{{ entry.maskAssigned }}</span>
          <span class="redaction-panel__report-reason">{{ formatReason(entry) }}</span>
        </li>
      </ul>
      <p v-else class="redaction-panel__report-empty">No redactions captured yet.</p>
      <p v-if="remainingCount" class="redaction-panel__report-more">
        {{ remainingCount }} more redactions hidden.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
// biome-ignore lint/correctness/noUnusedImports: used in template.
import FpTooltip from './FpTooltip.vue';

export type RedactionEntry = {
  fieldPath: string;
  maskAssigned: string;
  reason: string;
  entropyValue?: number;
};

const props = withDefaults(
  defineProps<{
    enabled: boolean;
    strictMode: boolean;
    threshold: number;
    redactions?: RedactionEntry[];
  }>(),
  {
    redactions: () => [],
  },
);

const emit = defineEmits<{
  'update:enabled': [boolean];
  'update:strictMode': [boolean];
  'update:threshold': [number];
}>();

const MIN_THRESHOLD = 3;
const MAX_THRESHOLD = 6;

const pendingDisable = ref(false);

watch(
  () => props.enabled,
  (value) => {
    if (!value) {
      pendingDisable.value = false;
    }
  },
);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const displayEnabled = computed(() => (pendingDisable.value ? true : props.enabled));

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const statusLabel = computed(() => {
  if (pendingDisable.value) return 'confirm';
  return props.enabled ? 'on' : 'off';
});

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const statusText = computed(() => {
  if (pendingDisable.value) return 'Confirm disable';
  return props.enabled ? 'Enabled' : 'Disabled';
});

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const warningVisible = computed(() => pendingDisable.value || !props.enabled);

const clampThreshold = (value: number) => Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, value));

const formatThreshold = (value: number) => String(Math.round(value * 10) / 10);

const thresholdInput = ref(formatThreshold(props.threshold));

watch(
  () => props.threshold,
  (value) => {
    thresholdInput.value = formatThreshold(value);
  },
);

const applyThreshold = (value: number) => {
  const clamped = clampThreshold(value);
  const rounded = Math.round(clamped * 10) / 10;
  thresholdInput.value = formatThreshold(rounded);
  emit('update:threshold', rounded);
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const thresholdValue = computed(() => clampThreshold(props.threshold));

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleThresholdInput = (event: Event) => {
  const value = Number((event.target as HTMLInputElement).value);
  if (!Number.isFinite(value)) return;
  applyThreshold(value);
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleThresholdCommit = () => {
  const value = Number(thresholdInput.value);
  if (!Number.isFinite(value)) {
    thresholdInput.value = formatThreshold(props.threshold);
    return;
  }
  applyThreshold(value);
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleEnabledToggle = (event: Event) => {
  const next = (event.target as HTMLInputElement).checked;
  if (next) {
    pendingDisable.value = false;
    emit('update:enabled', true);
    return;
  }
  pendingDisable.value = true;
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleStrictToggle = (event: Event) => {
  const next = (event.target as HTMLInputElement).checked;
  emit('update:strictMode', next);
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const confirmDisable = () => {
  pendingDisable.value = false;
  emit('update:enabled', false);
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const cancelDisable = () => {
  pendingDisable.value = false;
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const enableRedaction = () => {
  emit('update:enabled', true);
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const reportCount = computed(() => props.redactions.length);
const reportItems = computed(() => props.redactions.slice(0, 5));
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const remainingCount = computed(() =>
  Math.max(0, props.redactions.length - reportItems.value.length),
);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const entryKey = (entry: RedactionEntry) => `${entry.fieldPath}-${entry.maskAssigned}`;

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const formatReason = (entry: RedactionEntry) => {
  if (entry.reason === 'entropy' && Number.isFinite(entry.entropyValue)) {
    return `entropy: ${Number(entry.entropyValue).toFixed(1)}`;
  }
  return entry.reason;
};
</script>

<style scoped>
.redaction-panel {
  display: grid;
  gap: var(--fp-space-4);
  padding: var(--fp-space-4);
  border-radius: var(--fp-radius-2xl);
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
}

.redaction-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--fp-space-4);
}

.redaction-panel__title {
  font-weight: 600;
  font-size: 15px;
  margin: 0 0 var(--fp-space-1);
}

.redaction-panel__subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--fp-text-secondary);
}

.redaction-panel__badge {
  border-radius: var(--fp-radius-full);
  padding: var(--fp-space-1) var(--fp-space-2-5);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid rgba(148, 163, 184, 0.4);
}

.redaction-panel__badge[data-status='on'] {
  color: #4ade80;
  border-color: rgba(74, 222, 128, 0.6);
}

.redaction-panel__badge[data-status='off'] {
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.6);
}

.redaction-panel__badge[data-status='confirm'] {
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.6);
}

.redaction-panel__controls {
  display: grid;
  gap: var(--fp-space-3);
}

.redaction-panel__toggle {
  display: flex;
  align-items: center;
  gap: var(--fp-space-2-5);
  font-size: 13px;
}

.redaction-panel__checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--fp-accent-primary);
  cursor: pointer;
  transition: opacity var(--fp-duration-fast) var(--fp-ease-out);
}

.redaction-panel__checkbox:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.redaction-panel__toggle-text {
  color: var(--fp-text-secondary);
}

.redaction-panel__threshold {
  display: grid;
  gap: var(--fp-space-2-5);
  padding: var(--fp-space-3);
  border-radius: var(--fp-radius-xl);
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.5);
}

.redaction-panel__threshold-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fp-space-3);
}

.redaction-panel__threshold-label-group {
  display: inline-flex;
  align-items: center;
  gap: var(--fp-space-2);
}

.redaction-panel__threshold-label {
  font-size: 12px;
  color: var(--fp-text-secondary);
}

.redaction-panel__threshold-input {
  width: 72px;
  padding: var(--fp-space-1-5) var(--fp-space-2-5);
  border-radius: var(--fp-radius-lg);
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.8);
  color: inherit;
  font-size: 12px;
  text-align: center;
  transition: border-color var(--fp-duration-fast) var(--fp-ease-out),
              background-color var(--fp-duration-fast) var(--fp-ease-out),
              box-shadow var(--fp-duration-fast) var(--fp-ease-out);
  -moz-appearance: textfield;
}

.redaction-panel__threshold-input::-webkit-inner-spin-button,
.redaction-panel__threshold-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.redaction-panel__threshold-input:hover:not(:disabled) {
  border-color: rgba(148, 163, 184, 0.5);
}

.redaction-panel__threshold-input:focus {
  outline: none;
  border-color: var(--fp-border-focus);
  background: rgba(15, 23, 42, 1);
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

.redaction-panel__threshold-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.redaction-panel__slider {
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: var(--fp-radius-full);
  background: rgba(148, 163, 184, 0.2);
  outline: none;
  transition: background var(--fp-duration-fast) var(--fp-ease-out);
  cursor: pointer;
}

.redaction-panel__slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  margin-top: -6px;
  border-radius: var(--fp-radius-full);
  background: var(--fp-accent-primary);
  border: 2px solid var(--fp-surface-base);
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
  cursor: pointer;
  transition: transform var(--fp-duration-fast) var(--fp-ease-out),
              box-shadow var(--fp-duration-fast) var(--fp-ease-out);
}

.redaction-panel__slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
}

.redaction-panel__slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: var(--fp-radius-full);
  background: var(--fp-accent-primary);
  border: 2px solid var(--fp-surface-base);
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
  cursor: pointer;
  transition: transform var(--fp-duration-fast) var(--fp-ease-out),
              box-shadow var(--fp-duration-fast) var(--fp-ease-out);
}

.redaction-panel__slider::-moz-range-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
}

.redaction-panel__slider::-moz-range-track {
  height: 6px;
  border-radius: var(--fp-radius-full);
  background: rgba(148, 163, 184, 0.2);
}

.redaction-panel__slider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.redaction-panel__slider:disabled::-webkit-slider-thumb {
  cursor: not-allowed;
}

.redaction-panel__slider:disabled::-moz-range-thumb {
  cursor: not-allowed;
}

.redaction-panel__threshold-help {
  margin: 0;
  font-size: 11px;
  color: var(--fp-text-muted);
}

.redaction-panel__warning {
  border-radius: var(--fp-radius-xl);
  padding: var(--fp-space-3);
  border: 1px solid rgba(248, 113, 113, 0.5);
  background: rgba(127, 29, 29, 0.3);
  display: grid;
  gap: var(--fp-space-2-5);
}

.redaction-panel__warning-title {
  margin: 0;
  font-weight: 600;
  font-size: 13px;
  color: #fca5a5;
}

.redaction-panel__warning-text {
  margin: 0;
  font-size: 12px;
  color: rgba(248, 250, 252, 0.8);
}

.redaction-panel__warning-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--fp-space-2);
}

.redaction-panel__warning-button {
  border-radius: var(--fp-radius-lg);
  border: 1px solid rgba(248, 113, 113, 0.6);
  background: rgba(248, 113, 113, 0.2);
  color: #fee2e2;
  padding: var(--fp-space-1-5) var(--fp-space-2-5);
  font-size: 12px;
  cursor: pointer;
}

.redaction-panel__warning-button--ghost {
  background: transparent;
  border-color: rgba(148, 163, 184, 0.4);
  color: #e2e8f0;
}

.redaction-panel__report {
  display: grid;
  gap: var(--fp-space-2-5);
}

.redaction-panel__report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.redaction-panel__report-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.redaction-panel__report-count {
  font-size: 11px;
  color: var(--fp-text-muted);
}

.redaction-panel__report-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: var(--fp-space-2);
}

.redaction-panel__report-item {
  display: grid;
  gap: var(--fp-space-1);
  padding: var(--fp-space-2) var(--fp-space-2-5);
  border-radius: var(--fp-radius-xl);
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.redaction-panel__report-path {
  font-size: 12px;
  font-weight: 600;
  color: var(--fp-text-secondary);
}

.redaction-panel__report-mask {
  font-size: 12px;
  color: var(--fp-text-secondary);
}

.redaction-panel__report-reason {
  font-size: 11px;
  color: var(--fp-text-muted);
}

.redaction-panel__report-empty {
  margin: 0;
  font-size: 12px;
  color: var(--fp-text-muted);
}

.redaction-panel__report-more {
  margin: 0;
  font-size: 11px;
  color: var(--fp-text-muted);
}
</style>
