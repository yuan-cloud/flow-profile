<template>
  <div class="relative min-h-screen">
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <div id="app-live-region" class="sr-only" aria-live="polite" aria-atomic="true"></div>
    <div class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_60%)]"></div>
    <div class="absolute inset-0 -z-20 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900"></div>

    <div class="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-10">
      <AppHeader />
      <main id="main-content" class="flex-1" tabindex="-1">
        <slot />
      </main>
      <footer class="flex flex-wrap items-center justify-between gap-3 text-xs text-fp-text-muted" role="contentinfo">
        <span>Flow Profile Web UI — deterministic, local-first context builder</span>
        <span>Built with Vue 3 + Vite + Tailwind</span>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template.
import AppHeader from '@/components/AppHeader.vue';
</script>
