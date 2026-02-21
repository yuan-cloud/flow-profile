<template>
  <section data-testid="token-meter" class="token-meter" :data-status="status">
    <div class="token-meter__header">
      <div>
        <p class="token-meter__label">Token Budget</p>
        <p class="token-meter__value">{{ formattedCurrent }} / {{ formattedBudget }} tokens</p>
      </div>
      <div class="token-meter__meta">
        <span class="token-meter__percent">{{ roundedPercentage }}%</span>
        <span class="token-meter__status" :data-status="status">{{ statusLabel }}</span>
      </div>
    </div>
    <ProgressBar :value="current" :max="budget" :show-label="true" :label="`${roundedPercentage}%`" />
    <div class="token-meter__grid">
      <div class="token-meter__breakdown">
        <p class="token-meter__section-title">Breakdown</p>
        <ul class="token-meter__list">
          <li v-for="item in breakdownItems" :key="item.key" class="token-meter__list-item">
            <button class="token-meter__item" type="button" @click="handleBreakdownSelect(item.key)">
              <span class="token-meter__item-label">{{ item.label }}</span>
              <span class="token-meter__item-value">{{ formatTokens(item.value) }} tokens</span>
            </button>
          </li>
        </ul>
      </div>
      <div class="token-meter__controls">
        <p class="token-meter__section-title">Budget</p>
        <label class="token-meter__control">
          <span class="token-meter__control-label">Budget</span>
          <input
            v-model="budgetInput"
            class="token-meter__input"
            type="number"
            min="0"
            step="100"
            @blur="handleBudgetCommit"
            @keyup.enter="handleBudgetCommit"
          />
        </label>
        <label class="token-meter__control">
          <span class="token-meter__control-label token-meter__control-label--with-tooltip">
            Preset
            <FpTooltip text="Preset budgets match common model context sizes. Choose one to set your target." />
          </span>
          <select class="token-meter__select" :value="activePresetValue" @change="handlePresetChange">
            <option v-for="preset in presetOptions" :key="preset.label" :value="preset.value">
              {{ preset.label }}
            </option>
            <option value="custom">Custom</option>
          </select>
        </label>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
// biome-ignore lint/correctness/noUnusedImports: used in template.
import FpTooltip from './FpTooltip.vue';

// biome-ignore lint/correctness/noUnusedImports: used in template.
import ProgressBar from './ProgressBar.vue';

type TokenBreakdown = {
  summary: number;
  nodeDescriptions: number;
  functionCode: number;
  riskFindings: number;
};

type TokenPreset = {
  label: string;
  value: number;
};

type TokenBreakdownKey = keyof TokenBreakdown;

const props = withDefaults(
  defineProps<{
    current: number;
    budget: number;
    breakdown: TokenBreakdown;
    presets?: TokenPreset[];
    status?: 'auto' | 'ok' | 'warning' | 'over';
  }>(),
  {
    status: 'auto',
    presets: () => [],
    breakdown: () => ({
      summary: 0,
      nodeDescriptions: 0,
      functionCode: 0,
      riskFindings: 0,
    }),
  },
);

const emit = defineEmits<{
  'update:budget': [number];
  'select-breakdown': [TokenBreakdownKey];
  'select-preset': [TokenPreset];
}>();

const numberFormatter = new Intl.NumberFormat('en-US');

const budgetInput = ref(String(props.budget));

watch(
  () => props.budget,
  (value) => {
    budgetInput.value = String(Math.max(0, Math.round(value)));
  },
);

const percentage = computed(() => {
  if (props.budget <= 0) return 0;
  return (props.current / props.budget) * 100;
});

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const roundedPercentage = computed(() => Math.max(0, Math.round(percentage.value)));

const status = computed(() => {
  if (props.status !== 'auto') return props.status;
  if (percentage.value > 100) return 'over';
  if (percentage.value >= 80) return 'warning';
  return 'ok';
});

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const statusLabel = computed(() => {
  if (status.value === 'over') return 'Over budget';
  if (status.value === 'warning') return 'Near limit';
  return 'OK';
});

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const formattedCurrent = computed(() => formatTokens(props.current));

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const formattedBudget = computed(() => formatTokens(props.budget));

const presetOptions = computed<TokenPreset[]>(() => {
  if (props.presets.length) return props.presets;
  return [
    { label: 'GPT-4 8K', value: 8000 },
    { label: 'GPT-4 128K', value: 128000 },
    { label: 'Claude 100K', value: 100000 },
  ];
});

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const activePresetValue = computed(() => {
  const match = presetOptions.value.find((preset) => preset.value === props.budget);
  return match ? String(match.value) : 'custom';
});

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const breakdownItems = computed(() => [
  { key: 'summary', label: 'Summary', value: props.breakdown.summary },
  { key: 'nodeDescriptions', label: 'Node descriptions', value: props.breakdown.nodeDescriptions },
  { key: 'functionCode', label: 'Function code', value: props.breakdown.functionCode },
  { key: 'riskFindings', label: 'Risk findings', value: props.breakdown.riskFindings },
]);

const formatTokens = (value: number) =>
  numberFormatter.format(Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleBreakdownSelect = (key: TokenBreakdownKey) => {
  emit('select-breakdown', key);
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleBudgetCommit = () => {
  const parsed = Number(budgetInput.value);
  if (!Number.isFinite(parsed)) return;
  const next = Math.max(0, Math.round(parsed));
  budgetInput.value = String(next);
  emit('update:budget', next);
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handlePresetChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value;
  if (value === 'custom') return;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return;
  const preset = presetOptions.value.find((option) => option.value === parsed);
  if (!preset) return;
  emit('update:budget', preset.value);
  emit('select-preset', preset);
};
</script>

<style scoped>
.token-meter {
  display: grid;
  gap: var(--fp-space-4);
  padding: var(--fp-space-4);
  border-radius: var(--fp-radius-2xl);
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
}

.token-meter__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--fp-space-3);
}

.token-meter__label {
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--fp-text-muted);
}

.token-meter__value {
  font-size: 20px;
  font-weight: 600;
}

.token-meter__meta {
  display: grid;
  justify-items: end;
  gap: var(--fp-space-1-5);
}

.token-meter__percent {
  font-size: 14px;
  font-weight: 600;
  color: var(--fp-text-secondary);
}

.token-meter__status {
  font-size: 12px;
  padding: var(--fp-space-1) var(--fp-space-2);
  border-radius: var(--fp-radius-full);
  border: 1px solid rgba(148, 163, 184, 0.4);
  text-transform: uppercase;
}

.token-meter__grid {
  display: grid;
  gap: var(--fp-space-4);
}

.token-meter__section-title {
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--fp-text-muted);
}

.token-meter__breakdown {
  display: grid;
  gap: var(--fp-space-3);
}

.token-meter__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: var(--fp-space-2);
}

.token-meter__list-item {
  width: 100%;
}

.token-meter__item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--fp-space-2);
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: var(--fp-radius-xl);
  padding: var(--fp-space-2) var(--fp-space-2-5);
  color: inherit;
  cursor: pointer;
  text-align: left;
  font: inherit;
}

.token-meter__item:hover {
  border-color: rgba(148, 163, 184, 0.4);
}

.token-meter__item-label {
  font-size: 13px;
  color: var(--fp-text-secondary);
}

.token-meter__item-value {
  font-size: 12px;
  color: var(--fp-text-muted);
}

.token-meter__controls {
  display: grid;
  gap: var(--fp-space-3);
}

.token-meter__control {
  display: grid;
  gap: var(--fp-space-1-5);
}

.token-meter__control-label {
  font-size: 12px;
  color: var(--fp-text-muted);
}

.token-meter__control-label--with-tooltip {
  display: inline-flex;
  align-items: center;
  gap: var(--fp-space-2);
}

.token-meter__input,
.token-meter__select {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: var(--fp-radius-xl);
  padding: var(--fp-space-2) var(--fp-space-2-5);
  color: inherit;
  font: inherit;
}

.token-meter__input:focus,
.token-meter__select:focus {
  outline: none;
  border-color: rgba(56, 189, 248, 0.7);
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

.token-meter__status[data-status='warning'] {
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.6);
}

.token-meter__status[data-status='over'] {
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.6);
}

.token-meter[data-status='warning'] :deep(.progress-bar__fill) {
  background: linear-gradient(90deg, #facc15, #f97316);
}

.token-meter[data-status='over'] :deep(.progress-bar__fill) {
  background: linear-gradient(90deg, #f87171, #ef4444);
}

@media (min-width: 720px) {
  .token-meter__grid {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
    align-items: start;
  }
}
</style>
