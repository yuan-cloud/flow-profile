<template>
  <section class="relative overflow-hidden rounded-fp-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-2xl">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_65%)]"></div>
    <div class="relative space-y-6">
      <header>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-sky-200">Capability Inspector</p>
            <h3 class="mt-2 text-2xl font-semibold text-white">Tools vs resources</h3>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span class="rounded-fp-full border border-slate-700 bg-slate-900/70 px-3 py-1">
              Tools: {{ tools.length }}
            </span>
            <span class="rounded-fp-full border border-slate-700 bg-slate-900/70 px-3 py-1">
              Resources: {{ resources.length }}
            </span>
            <span class="rounded-fp-full border border-slate-700 bg-slate-900/70 px-3 py-1">
              Uncertain: {{ uncertainCount }}
            </span>
          </div>
        </div>
        <p class="mt-3 max-w-2xl text-sm text-fp-text-muted">
          MCP-style separation of what the assistant can <span class="text-slate-200">do</span> (tools) vs what it can
          <span class="text-slate-200">read</span> (resources). Click a capability to highlight its node.
        </p>
      </header>

      <div v-if="!hasCapabilities" class="rounded-fp-2xl border border-slate-800/70 bg-slate-900/40 p-4">
        <p class="text-sm font-medium text-slate-200">No capability surface yet</p>
        <p class="mt-2 text-sm text-fp-text-muted">
          Load a flow to infer tools and resources for the capability manifest.
        </p>
      </div>

      <div v-else class="grid gap-5 lg:grid-cols-2">
        <div class="space-y-3 rounded-fp-2xl border border-slate-800/70 bg-slate-950/60 p-4">
          <div class="flex items-center justify-between">
            <p class="text-[11px] uppercase tracking-[0.25em] text-fp-text-muted">Tools (actions)</p>
            <span class="rounded-fp-full border border-slate-700 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
              {{ tools.length }} total
            </span>
          </div>
          <div v-if="tools.length === 0" class="rounded-fp-xl border border-slate-800/70 bg-slate-900/40 p-3 text-sm text-fp-text-muted">
            No tool capabilities detected yet.
          </div>
          <div v-else class="space-y-3">
            <article
              v-for="tool in tools"
              :key="`tool-${tool.nodeId}`"
              class="rounded-fp-xl border border-slate-800/70 bg-slate-950/70 p-3"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="text-sm font-semibold text-slate-100">{{ tool.name }}</p>
                  <p class="mt-1 text-xs text-fp-text-muted">{{ tool.description }}</p>
                </div>
                <span class="rounded-fp-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em]" :class="confidenceClass(tool.confidence)">
                  {{ tool.confidence }}
                </span>
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-fp-text-muted">
                <button
                  class="rounded-fp-full border px-3 py-1 text-xs transition"
                  :class="nodeButtonClass(tool.nodeId)"
                  type="button"
                  @click="emit('select-capability', tool.nodeId)"
                >
                  {{ tool.nodeName }}
                </button>
                <span v-if="tool.inferred" class="rounded-fp-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-fp-text-muted">
                  inferred
                </span>
              </div>
            </article>
          </div>
        </div>

        <div class="space-y-3 rounded-fp-2xl border border-slate-800/70 bg-slate-950/60 p-4">
          <div class="flex items-center justify-between">
            <p class="text-[11px] uppercase tracking-[0.25em] text-fp-text-muted">Resources (inputs)</p>
            <span class="rounded-fp-full border border-slate-700 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
              {{ resources.length }} total
            </span>
          </div>
          <div v-if="resources.length === 0" class="rounded-fp-xl border border-slate-800/70 bg-slate-900/40 p-3 text-sm text-fp-text-muted">
            No resource capabilities detected yet.
          </div>
          <div v-else class="space-y-3">
            <article
              v-for="resource in resources"
              :key="`resource-${resource.nodeId}`"
              class="rounded-fp-xl border border-slate-800/70 bg-slate-950/70 p-3"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="text-sm font-semibold text-slate-100">{{ resource.name }}</p>
                  <p class="mt-1 text-xs text-fp-text-muted">{{ resource.description }}</p>
                </div>
                <span class="rounded-fp-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em]" :class="confidenceClass(resource.confidence)">
                  {{ resource.confidence }}
                </span>
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-fp-text-muted">
                <button
                  class="rounded-fp-full border px-3 py-1 text-xs transition"
                  :class="nodeButtonClass(resource.nodeId)"
                  type="button"
                  @click="emit('select-capability', resource.nodeId)"
                >
                  {{ resource.nodeName }}
                </button>
                <span v-if="resource.inferred" class="rounded-fp-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-fp-text-muted">
                  inferred
                </span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Capability } from '@flow-profile/core';
import { computed } from 'vue';

const props = defineProps<{
  tools: Capability[];
  resources: Capability[];
  selectedIds?: string[];
}>();

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const emit = defineEmits<(event: 'select-capability', nodeId: string) => void>();

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const hasCapabilities = computed(() => props.tools.length + props.resources.length > 0);
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const uncertainCount = computed(
  () =>
    [...props.tools, ...props.resources].filter(
      (capability) => capability.inferred || capability.confidence !== 'high',
    ).length,
);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const nodeButtonClass = (nodeId: string) =>
  props.selectedIds?.includes(nodeId)
    ? 'border-sky-400/60 text-sky-100 bg-sky-500/10'
    : 'border-slate-700 text-slate-200 hover:border-sky-500/40';

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const confidenceClass = (confidence: Capability['confidence']) => {
  if (confidence === 'high') return 'border-emerald-300/40 text-emerald-100 bg-emerald-500/10';
  if (confidence === 'medium') return 'border-amber-300/40 text-amber-100 bg-amber-500/10';
  return 'border-rose-300/40 text-rose-100 bg-rose-500/10';
};
</script>
