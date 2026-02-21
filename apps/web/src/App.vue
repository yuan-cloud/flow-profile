<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <AppShell>
      <RouterView />
    </AppShell>
  </div>
</template>

<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template.
import { RouterView } from 'vue-router';

// biome-ignore lint/correctness/noUnusedImports: used in template.
import AppShell from '@/components/AppShell.vue';
</script>
