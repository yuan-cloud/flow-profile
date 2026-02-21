<template>
  <div
    class="skeleton-block"
    :class="{ 'skeleton-block--rounded': rounded }"
    :style="{ width, height }"
    role="status"
    :aria-label="label"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: string;
    height?: string;
    rounded?: boolean;
    label?: string;
  }>(),
  {
    width: '100%',
    height: '1rem',
    rounded: false,
    label: 'Loading...',
  },
);
</script>

<style scoped>
.skeleton-block {
  background: linear-gradient(
    90deg,
    rgba(148, 163, 184, 0.08) 25%,
    rgba(148, 163, 184, 0.16) 50%,
    rgba(148, 163, 184, 0.08) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--fp-radius-lg);
}

.skeleton-block--rounded {
  border-radius: var(--fp-radius-full);
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
