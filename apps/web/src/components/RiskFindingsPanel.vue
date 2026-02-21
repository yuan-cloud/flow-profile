<template>
  <section data-testid="risk-findings-panel" class="fp-entrance relative overflow-hidden rounded-fp-3xl border border-slate-800 bg-slate-950/[var(--fp-opacity-prominent)] p-6 shadow-2xl">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.14),_transparent_65%)]"></div>
    <div class="relative space-y-5">
      <header>
        <p class="fp-type-overline text-rose-200">Risk Findings</p>
        <h3 class="mt-2 fp-type-h3 text-white">Static signals worth reviewing</h3>
        <p class="mt-2 max-w-2xl text-sm text-fp-text-muted">
          Click a node to highlight it in the flow tree. Findings are conservative and recommend review.
        </p>
      </header>

      <div
        v-if="riskFindings.length === 0"
        class="rounded-fp-2xl border border-dashed border-emerald-500/[var(--fp-opacity-default)] bg-slate-900/[var(--fp-opacity-default)] p-5"
      >
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-fp-2xl border border-emerald-500/[var(--fp-opacity-default)] bg-emerald-500/[var(--fp-opacity-subtle)] text-emerald-100 animate-fp-pulse">
            <ShieldCheck :size="20" :stroke-width="2" aria-hidden="true" />
          </div>
          <div>
            <p class="text-sm font-medium text-slate-200">No risks flagged</p>
            <p class="mt-2 text-sm text-fp-text-muted">
              Your flow looks clear according to the current heuristic checks.
            </p>
            <p class="mt-2 text-xs text-emerald-200">Keep shipping — we’ll surface anything suspicious here.</p>
          </div>
        </div>
      </div>

      <div v-else class="grid gap-4 fp-entrance-stagger">
        <article
          v-for="finding in riskFindings"
          :key="`${finding.id}-${finding.affectedNodes[0]?.id ?? 'none'}`"
          :id="`risk-${finding.id}`"
          class="rounded-fp-2xl border border-slate-800/[var(--fp-opacity-prominent)] bg-slate-950/[var(--fp-opacity-prominent)] p-4 transition"
          :class="focusedFindingId === finding.id ? 'ring-2 ring-rose-400/[var(--fp-opacity-prominent)]' : ''"
          @contextmenu.prevent="openMenu(finding, $event)"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="text-sm font-semibold text-slate-100">{{ finding.title }}</p>
              <p class="mt-1 text-xs text-fp-text-muted">{{ finding.description }}</p>
            </div>
            <span
              class="rounded-fp-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em]"
              :class="severityClass(finding.severity)"
            >
              {{ severityIcon(finding.severity) }} {{ finding.severity }}
            </span>
          </div>

          <div class="mt-3 text-xs text-fp-text-muted">
            <p><span class="text-slate-300">Evidence:</span> {{ finding.evidence }}</p>
            <p class="mt-1"><span class="text-slate-300">Remediation:</span> {{ finding.remediation }}</p>
          </div>

          <div v-if="finding.affectedNodes.length" class="mt-4 space-y-2">
            <p class="fp-type-overline text-fp-text-muted">Affected nodes</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="node in finding.affectedNodes"
                :key="node.id"
                class="rounded-fp-full border px-3 py-1 text-xs transition fp-touch-target"
                :class="nodeButtonClass(node.id)"
                type="button"
                :aria-pressed="selectedNodes.has(node.id)"
                @click="toggleNode(node.id)"
              >
                {{ node.name || node.id }}
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
    <div v-if="menuOpen" class="fp-context-menu__backdrop" @click="closeMenu"></div>
    <div
      v-if="menuOpen"
      class="fp-context-menu"
      role="menu"
      :style="{ left: `${menuPosition.x}px`, top: `${menuPosition.y}px` }"
    >
      <button class="fp-context-menu__item" type="button" role="menuitem" @click="viewDetails">
        View details
      </button>
      <button class="fp-context-menu__item" type="button" role="menuitem" @click="copyDetails">
        Copy details
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template.
import { ShieldCheck } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { onBeforeUnmount, onMounted, ref } from 'vue';

import { useFlowStore } from '@/stores/flow';
import { copyText } from '@/utils/export';

const flowStore = useFlowStore();
const { riskFindings, selectedNodes } = storeToRefs(flowStore);
const menuOpen = ref(false);
const menuPosition = ref({ x: 0, y: 0 });
const menuFinding = ref<{
  id: string;
  title: string;
  description: string;
  severity: string;
  evidence: string;
  remediation: string;
  affectedNodes: Array<{ id: string; name?: string | null }>;
} | null>(null);
const focusedFindingId = ref<string | null>(null);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const toggleNode = (nodeId: string) => {
  flowStore.toggleNode(nodeId);
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const severityClass = (severity: string) => {
  if (severity === 'high')
    return 'border-rose-400/[var(--fp-opacity-prominent)] text-rose-200 bg-rose-500/[var(--fp-opacity-subtle)]';
  if (severity === 'medium')
    return 'border-amber-300/[var(--fp-opacity-medium)] text-amber-200 bg-amber-500/[var(--fp-opacity-subtle)]';
  return 'border-emerald-300/[var(--fp-opacity-default)] text-emerald-200 bg-emerald-500/[var(--fp-opacity-subtle)]';
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const severityIcon = (severity: string) => {
  if (severity === 'high') return '🔴';
  if (severity === 'medium') return '⚠️';
  return 'ℹ️';
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const nodeButtonClass = (nodeId: string) =>
  selectedNodes.value.has(nodeId)
    ? 'border-emerald-400/[var(--fp-opacity-prominent)] text-emerald-100 bg-emerald-500/[var(--fp-opacity-subtle)]'
    : 'border-slate-700 text-slate-200 hover:border-emerald-500/[var(--fp-opacity-default)]';

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const openMenu = (finding: (typeof riskFindings.value)[number], event: MouseEvent) => {
  menuFinding.value = finding;
  menuPosition.value = { x: event.clientX, y: event.clientY };
  menuOpen.value = true;
};

const closeMenu = () => {
  menuOpen.value = false;
  menuFinding.value = null;
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const viewDetails = () => {
  if (!menuFinding.value) return;
  focusedFindingId.value = menuFinding.value.id;
  const target = document.getElementById(`risk-${menuFinding.value.id}`);
  target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => {
    if (focusedFindingId.value === menuFinding.value?.id) {
      focusedFindingId.value = null;
    }
  }, 1600);
  closeMenu();
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const copyDetails = async () => {
  if (!menuFinding.value) return;
  const affected = menuFinding.value.affectedNodes.map((node) => node.name || node.id).join(', ');
  const details = [
    `Risk: ${menuFinding.value.title}`,
    `Severity: ${menuFinding.value.severity}`,
    `Evidence: ${menuFinding.value.evidence}`,
    `Remediation: ${menuFinding.value.remediation}`,
    `Affected nodes: ${affected || 'None'}`,
  ].join('\n');
  await copyText(details);
  closeMenu();
};

const handleGlobalKeydown = (event: KeyboardEvent) => {
  if (!menuOpen.value) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeMenu();
  }
};

const handleGlobalClick = (event: MouseEvent) => {
  if (!menuOpen.value) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest('.fp-context-menu')) return;
  closeMenu();
};

onMounted(() => {
  window.addEventListener('click', handleGlobalClick);
  window.addEventListener('keydown', handleGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', handleGlobalClick);
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>
