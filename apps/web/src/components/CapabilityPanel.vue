<template>
  <UiCapabilityPanel
    :tools="tools"
    :resources="resources"
    :selected-ids="selectedIds"
    @select-capability="handleSelect"
  />
</template>

<script setup lang="ts">
import type { Capability, CapabilityManifest } from '@flow-profile/core';
// biome-ignore lint/correctness/noUnusedImports: used in template.
import { CapabilityPanel as UiCapabilityPanel } from '@flow-profile/ui';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

import { useFlowStore } from '@/stores/flow';

const flowStore = useFlowStore();
const { capabilities, selectedNodes } = storeToRefs(flowStore);

const capabilityManifest = computed<CapabilityManifest | null>(() => {
  const raw = capabilities.value;
  if (!raw || typeof raw !== 'object') return null;
  const manifest = raw as CapabilityManifest;
  if (!Array.isArray(manifest.tools) || !Array.isArray(manifest.resources)) return null;
  return manifest;
});

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const tools = computed<Capability[]>(() => capabilityManifest.value?.tools ?? []);
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const resources = computed<Capability[]>(() => capabilityManifest.value?.resources ?? []);
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const selectedIds = computed(() => Array.from(selectedNodes.value));

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleSelect = (nodeId: string) => {
  flowStore.toggleNode(nodeId);
};
</script>
