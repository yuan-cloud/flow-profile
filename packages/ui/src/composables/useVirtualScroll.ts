import { computed, ref } from 'vue';

export const useVirtualScroll = <T>(items: T[], itemHeight: number, overscan = 4) => {
  const scrollTop = ref(0);
  const viewportHeight = ref(0);

  const totalHeight = computed(() => items.length * itemHeight);

  const startIndex = computed(() => {
    const raw = Math.floor(scrollTop.value / itemHeight) - overscan;
    return Math.max(0, raw);
  });

  const endIndex = computed(() => {
    const visibleCount = Math.ceil(viewportHeight.value / itemHeight) + overscan * 2;
    return Math.min(items.length, startIndex.value + visibleCount);
  });

  const visibleItems = computed(() => items.slice(startIndex.value, endIndex.value));
  const offsetY = computed(() => startIndex.value * itemHeight);

  const onScroll = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    scrollTop.value = target.scrollTop;
    viewportHeight.value = target.clientHeight;
  };

  return {
    endIndex,
    offsetY,
    onScroll,
    startIndex,
    totalHeight,
    visibleItems,
  };
};
