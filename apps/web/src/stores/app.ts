import { VERSION as CORE_VERSION } from '@flow-profile/core';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  const webVersion = ref('0.0.1');
  const coreVersion = ref(CORE_VERSION);

  const versionLabel = computed(() => `web ${webVersion.value} · core ${coreVersion.value}`);

  return {
    coreVersion,
    webVersion,
    versionLabel,
  };
});
