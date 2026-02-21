<template>
  <section class="main-layout">
    <div v-if="isStackedMobile" class="main-layout__mobile">
      <div class="main-layout__tabs" role="tablist" aria-label="Workspace panels">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="main-layout__tab fp-touch-target"
          :data-active="activeTab === tab.key"
          :title="tabTitle(tab)"
          type="button"
          role="tab"
          :id="`tab-${tab.key}`"
          :aria-controls="`panel-${tab.key}`"
          :aria-selected="activeTab === tab.key"
          @click="setMobileTab(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>
      <div
        v-show="isStackedMobile || activeTab === 'flow'"
        :id="'panel-flow'"
        class="main-layout__panel"
        role="tabpanel"
        :aria-labelledby="'tab-flow'"
      >
        <slot name="left" />
      </div>
      <div
        v-show="isStackedMobile || activeTab === 'preview'"
        :id="'panel-preview'"
        class="main-layout__panel"
        role="tabpanel"
        :aria-labelledby="'tab-preview'"
      >
        <slot name="center" />
      </div>
      <div
        v-show="!isStackedMobile && activeTab === 'controls'"
        :id="'panel-controls'"
        class="main-layout__panel"
        role="tabpanel"
        :aria-labelledby="'tab-controls'"
      >
        <slot name="right" />
      </div>
    </div>

    <div v-if="isStackedMobile" class="main-layout__sheet">
      <button
        v-if="!bottomSheetOpen"
        class="main-layout__sheet-toggle fp-touch-target"
        type="button"
        @click="openBottomSheet"
      >
        Controls
      </button>
      <div
        v-show="bottomSheetOpen"
        class="main-layout__sheet-panel"
        :style="{ height: `${sheetHeight}px` }"
        @pointerdown="startSheetDrag"
      >
        <div class="main-layout__sheet-handle">
          <span></span>
        </div>
        <div class="main-layout__sheet-content fp-scroll-area">
          <slot name="right" />
        </div>
      </div>
    </div>

    <div v-else class="main-layout__desktop">
      <div class="main-layout__toolbar">
        <div class="main-layout__toolbar-left">
          <p class="main-layout__toolbar-title">Layout</p>
          <p class="main-layout__toolbar-subtitle">Responsive three-column workspace</p>
        </div>
        <div class="main-layout__toolbar-actions">
          <button
            class="main-layout__toggle fp-touch-target"
            type="button"
            aria-controls="flow-panel"
            :aria-expanded="leftPanelOpen"
            @click="leftPanelOpen = !leftPanelOpen"
          >
            {{ leftPanelOpen ? 'Hide flow' : 'Show flow' }}
          </button>
          <button
            class="main-layout__toggle fp-touch-target"
            type="button"
            aria-controls="controls-panel"
            :aria-expanded="rightPanelOpen"
            @click="rightPanelOpen = !rightPanelOpen"
          >
            {{ rightPanelOpen ? 'Hide controls' : 'Show controls' }}
          </button>
        </div>
      </div>

      <div class="main-layout__grid" :data-right-open="rightPanelOpen">
        <aside
          v-show="leftPanelOpen"
          id="flow-panel"
          ref="leftPanelRef"
          class="main-layout__column main-layout__left fp-scroll-area"
          :style="{ width: `${leftWidth}px` }"
          role="region"
          aria-label="Flow panel"
          tabindex="0"
        >
          <slot name="left" />
        </aside>
        <button
          v-if="!leftPanelOpen"
          class="main-layout__collapsed main-layout__collapsed--left fp-touch-target"
          type="button"
          aria-label="Show flow panel"
          @click="leftPanelOpen = true"
        >
          <PanelLeft :size="18" :stroke-width="2" aria-hidden="true" />
        </button>
        <div
          v-if="leftPanelOpen"
          class="main-layout__resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize flow panel"
          @pointerdown="startResize('left', $event)"
        ></div>
        <main ref="centerPanelRef" class="main-layout__column main-layout__center fp-scroll-area">
          <slot name="center" />
        </main>
        <div
          v-if="rightPanelOpen"
          class="main-layout__resizer main-layout__resizer--right"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize controls panel"
          @pointerdown="startResize('right', $event)"
        ></div>
        <aside
          v-show="rightPanelOpen"
          id="controls-panel"
          ref="rightPanelRef"
          class="main-layout__column main-layout__right fp-scroll-area"
          :style="{ width: `${rightWidth}px` }"
        >
          <slot name="right" />
        </aside>
        <button
          v-if="!rightPanelOpen"
          class="main-layout__collapsed main-layout__collapsed--right fp-touch-target"
          type="button"
          aria-label="Show controls panel"
          @click="rightPanelOpen = true"
        >
          <PanelRight :size="18" :stroke-width="2" aria-hidden="true" />
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template.
import { PanelLeft, PanelRight } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useShortcuts } from '@/composables/useShortcuts';

type MobileTab = 'flow' | 'preview' | 'controls';

type Tab = {
  key: MobileTab;
  label: string;
};

const props = defineProps<{
  mobileTab?: MobileTab;
}>();

const emit = defineEmits<{
  'update:mobileTab': [MobileTab];
}>();

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const tabs: Tab[] = [
  { key: 'flow', label: 'Flow' },
  { key: 'preview', label: 'Preview' },
  { key: 'controls', label: 'Controls' },
];

const { shortcuts, formatShortcut } = useShortcuts();
const internalTab = ref<MobileTab>('preview');
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const activeTab = computed(() => props.mobileTab ?? internalTab.value);
const leftPanelOpen = ref(true);
const rightPanelOpen = ref(true);
const isStackedMobile = ref(false);
const bottomSheetOpen = ref(true);
const sheetHeight = ref(320);
const sheetSnap = ref<'collapsed' | 'half' | 'full'>('half');
let sheetStartY = 0;
let sheetStartHeight = 0;
let sheetDragging = false;
const leftPanelRef = ref<HTMLElement | null>(null);
const centerPanelRef = ref<HTMLElement | null>(null);
const rightPanelRef = ref<HTMLElement | null>(null);

const MIN_LEFT = 220;
const MAX_LEFT = 360;
const MIN_RIGHT = 260;
const MAX_RIGHT = 420;

const leftWidth = ref(280);
const rightWidth = ref(320);

const LAYOUT_KEY = 'fp.layout';
const SCROLL_KEY = 'fp.layout.scroll';
const readLayout = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LAYOUT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      leftWidth?: number;
      rightWidth?: number;
      leftOpen?: boolean;
      rightOpen?: boolean;
    };
  } catch {
    return null;
  }
};

const persistLayout = () => {
  if (typeof window === 'undefined') return;
  const payload = {
    leftWidth: leftWidth.value,
    rightWidth: rightWidth.value,
    leftOpen: leftPanelOpen.value,
    rightOpen: rightPanelOpen.value,
  };
  window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(payload));
};

const scrollState = ref({ left: 0, center: 0, right: 0 });
let scrollTimer: number | null = null;

const readScrollState = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SCROLL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { left?: number; center?: number; right?: number };
  } catch {
    return null;
  }
};

const persistScroll = () => {
  if (typeof window === 'undefined') return;
  if (scrollTimer) window.clearTimeout(scrollTimer);
  scrollTimer = window.setTimeout(() => {
    window.localStorage.setItem(SCROLL_KEY, JSON.stringify(scrollState.value));
    scrollTimer = null;
  }, 120);
};

const updateScrollState = () => {
  scrollState.value = {
    left: leftPanelRef.value?.scrollTop ?? 0,
    center: centerPanelRef.value?.scrollTop ?? 0,
    right: rightPanelRef.value?.scrollTop ?? 0,
  };
  persistScroll();
};

const applyScrollState = (state: { left?: number; center?: number; right?: number }) => {
  if (leftPanelRef.value && typeof state.left === 'number') {
    leftPanelRef.value.scrollTop = state.left;
  }
  if (centerPanelRef.value && typeof state.center === 'number') {
    centerPanelRef.value.scrollTop = state.center;
  }
  if (rightPanelRef.value && typeof state.right === 'number') {
    rightPanelRef.value.scrollTop = state.right;
  }
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const setMobileTab = (tab: MobileTab) => {
  if (props.mobileTab === undefined) {
    internalTab.value = tab;
  }
  emit('update:mobileTab', tab);
  if (isStackedMobile.value && typeof document !== 'undefined') {
    const panel = document.getElementById(`panel-${tab}`);
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const tabTitle = (tab: Tab) => {
  const mapping: Record<MobileTab, keyof typeof shortcuts.value> = {
    flow: 'panelFlow',
    preview: 'panelPreview',
    controls: 'panelControls',
  };
  const shortcut = shortcuts.value[mapping[tab.key]];
  return `Switch to ${tab.label} (${formatShortcut(shortcut)})`;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

let resizeTarget: 'left' | 'right' | null = null;
let resizeStartX = 0;
let resizeStartWidth = 0;

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const startResize = (target: 'left' | 'right', event: PointerEvent) => {
  resizeTarget = target;
  resizeStartX = event.clientX;
  resizeStartWidth = target === 'left' ? leftWidth.value : rightWidth.value;
  document.body.style.cursor = 'col-resize';
  window.addEventListener('pointermove', handleResizeMove);
  window.addEventListener('pointerup', stopResize);
};

const handleResizeMove = (event: PointerEvent) => {
  if (!resizeTarget) return;
  const delta = event.clientX - resizeStartX;
  if (resizeTarget === 'left') {
    leftWidth.value = clamp(resizeStartWidth + delta, MIN_LEFT, MAX_LEFT);
  } else {
    rightWidth.value = clamp(resizeStartWidth - delta, MIN_RIGHT, MAX_RIGHT);
  }
};

const stopResize = () => {
  if (!resizeTarget) return;
  resizeTarget = null;
  document.body.style.cursor = '';
  window.removeEventListener('pointermove', handleResizeMove);
  window.removeEventListener('pointerup', stopResize);
  persistLayout();
};

const getSheetHeights = () => {
  const viewHeight = typeof window === 'undefined' ? 720 : window.innerHeight;
  return {
    collapsed: 84,
    half: Math.round(viewHeight * 0.5),
    full: Math.round(viewHeight * 0.85),
  };
};

const applySheetSnap = (target: 'collapsed' | 'half' | 'full') => {
  const heights = getSheetHeights();
  sheetSnap.value = target;
  sheetHeight.value = heights[target];
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const openBottomSheet = () => {
  bottomSheetOpen.value = true;
  applySheetSnap('half');
};

const closeBottomSheet = () => {
  bottomSheetOpen.value = false;
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const startSheetDrag = (event: PointerEvent) => {
  if (!isStackedMobile.value) return;
  sheetDragging = true;
  sheetStartY = event.clientY;
  sheetStartHeight = sheetHeight.value;
  window.addEventListener('pointermove', handleSheetDrag);
  window.addEventListener('pointerup', stopSheetDrag);
};

const handleSheetDrag = (event: PointerEvent) => {
  if (!sheetDragging) return;
  const delta = sheetStartY - event.clientY;
  const heights = getSheetHeights();
  const next = Math.max(heights.collapsed, Math.min(heights.full, sheetStartHeight + delta));
  sheetHeight.value = next;
};

const stopSheetDrag = () => {
  if (!sheetDragging) return;
  sheetDragging = false;
  window.removeEventListener('pointermove', handleSheetDrag);
  window.removeEventListener('pointerup', stopSheetDrag);

  const heights = getSheetHeights();
  const candidates: Array<{ key: 'collapsed' | 'half' | 'full'; value: number }> = [
    { key: 'collapsed', value: heights.collapsed },
    { key: 'half', value: heights.half },
    { key: 'full', value: heights.full },
  ];
  const nearest = candidates.reduce((best, candidate) =>
    Math.abs(candidate.value - sheetHeight.value) < Math.abs(best.value - sheetHeight.value)
      ? candidate
      : best,
  );
  applySheetSnap(nearest.key);

  if (nearest.key === 'collapsed' && sheetHeight.value < heights.collapsed + 24) {
    closeBottomSheet();
  }
};

watch([leftWidth, rightWidth, leftPanelOpen, rightPanelOpen], persistLayout, { deep: true });
watch([leftPanelOpen, rightPanelOpen], () => {
  const saved = readScrollState();
  if (saved) applyScrollState(saved);
});

let mobileMedia: MediaQueryList | null = null;
let mobileMediaHandler: (() => void) | null = null;

onMounted(() => {
  if (typeof window !== 'undefined') {
    mobileMedia = window.matchMedia('(max-width: 639px)');
    mobileMediaHandler = () => {
      isStackedMobile.value = mobileMedia?.matches ?? false;
      if (!isStackedMobile.value) {
        bottomSheetOpen.value = false;
      } else {
        bottomSheetOpen.value = true;
        applySheetSnap(sheetSnap.value);
      }
    };
    mobileMediaHandler();
    mobileMedia.addEventListener?.('change', mobileMediaHandler);
  }
  const saved = readLayout();
  if (!saved) return;
  if (typeof saved.leftWidth === 'number')
    leftWidth.value = clamp(saved.leftWidth, MIN_LEFT, MAX_LEFT);
  if (typeof saved.rightWidth === 'number')
    rightWidth.value = clamp(saved.rightWidth, MIN_RIGHT, MAX_RIGHT);
  if (typeof saved.leftOpen === 'boolean') leftPanelOpen.value = saved.leftOpen;
  if (typeof saved.rightOpen === 'boolean') rightPanelOpen.value = saved.rightOpen;

  const savedScroll = readScrollState();
  if (savedScroll) {
    scrollState.value = {
      left: savedScroll.left ?? 0,
      center: savedScroll.center ?? 0,
      right: savedScroll.right ?? 0,
    };
    applyScrollState(scrollState.value);
  }

  leftPanelRef.value?.addEventListener('scroll', updateScrollState, { passive: true });
  centerPanelRef.value?.addEventListener('scroll', updateScrollState, { passive: true });
  rightPanelRef.value?.addEventListener('scroll', updateScrollState, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', handleResizeMove);
  window.removeEventListener('pointerup', stopResize);
  leftPanelRef.value?.removeEventListener('scroll', updateScrollState);
  centerPanelRef.value?.removeEventListener('scroll', updateScrollState);
  rightPanelRef.value?.removeEventListener('scroll', updateScrollState);
  if (mobileMedia && mobileMediaHandler) {
    mobileMedia.removeEventListener?.('change', mobileMediaHandler);
  }
  window.removeEventListener('pointermove', handleSheetDrag);
  window.removeEventListener('pointerup', stopSheetDrag);
  if (scrollTimer) window.clearTimeout(scrollTimer);
});
</script>

<style scoped>
.main-layout {
  display: grid;
  gap: var(--fp-space-4);
}

.main-layout__mobile {
  display: grid;
  gap: var(--fp-space-4);
}

.main-layout__tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--fp-space-2);
  border-radius: var(--fp-radius-xl);
  border: 1px solid rgba(148, 163, 184, 0.2);
  padding: var(--fp-space-1-5);
  background: rgba(15, 23, 42, 0.6);
}

.main-layout__tab {
  border-radius: var(--fp-radius-xl);
  border: 1px solid transparent;
  padding: var(--fp-space-2) var(--fp-space-2-5);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--fp-text-secondary);
  background: transparent;
  cursor: pointer;
}

.main-layout__tab[data-active='true'] {
  background: rgba(15, 23, 42, 0.9);
  border-color: rgba(56, 189, 248, 0.4);
  color: #e2e8f0;
}

.main-layout__panel {
  display: grid;
  gap: var(--fp-space-4);
  scroll-margin-top: 80px;
}

.main-layout__desktop {
  display: none;
  gap: var(--fp-space-4);
}

.main-layout__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fp-space-4);
}

.main-layout__toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--fp-space-2);
}

.main-layout__toolbar-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  color: var(--fp-text-muted);
  margin: 0;
}

.main-layout__toolbar-subtitle {
  margin: var(--fp-space-1) 0 0;
  font-size: 13px;
  color: var(--fp-text-secondary);
}

.main-layout__toggle {
  border-radius: var(--fp-radius-full);
  border: 1px solid rgba(148, 163, 184, 0.4);
  padding: var(--fp-space-1-5) var(--fp-space-3);
  font-size: 12px;
  color: var(--fp-text-secondary);
  background: rgba(15, 23, 42, 0.6);
  cursor: pointer;
}

.main-layout__grid {
  display: flex;
  align-items: stretch;
  gap: var(--fp-space-5);
}

.main-layout__column {
  display: grid;
  gap: var(--fp-space-4);
  max-height: min(680px, calc(100vh - 260px));
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: var(--fp-space-1);
}

.main-layout__center {
  flex: 1;
  min-width: 0;
}

.main-layout__left,
.main-layout__right {
  flex-shrink: 0;
}

.main-layout__resizer {
  position: relative;
  width: 8px;
  cursor: col-resize;
  border-radius: var(--fp-radius-full);
  background: rgba(148, 163, 184, 0.2);
  transition: background 150ms ease;
}

.main-layout__resizer::after {
  content: '···';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px;
  letter-spacing: 2px;
  color: var(--fp-text-disabled);
  pointer-events: none;
}

.main-layout__resizer:hover {
  background: rgba(56, 189, 248, 0.6);
}

.main-layout__collapsed {
  width: 48px;
  border-radius: var(--fp-radius-2xl);
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.7);
  color: #e2e8f0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease;
}

.main-layout__collapsed:hover {
  border-color: rgba(56, 189, 248, 0.6);
  background: rgba(15, 23, 42, 0.9);
}

.main-layout__right {
  position: relative;
}

.main-layout__sheet {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 30;
  pointer-events: none;
}

.main-layout__sheet-toggle {
  position: fixed;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom));
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.9);
  color: #e2e8f0;
  padding: 8px 16px;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  pointer-events: auto;
  cursor: pointer;
}

.main-layout__sheet-panel {
  position: fixed;
  inset: auto 0 0 0;
  background: rgba(15, 23, 42, 0.98);
  border-top-left-radius: var(--fp-radius-2xl);
  border-top-right-radius: var(--fp-radius-2xl);
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 -18px 40px rgba(2, 6, 23, 0.45);
  display: grid;
  grid-template-rows: auto 1fr;
  pointer-events: auto;
}

.main-layout__sheet-handle {
  display: grid;
  place-items: center;
  padding: 8px 0;
}

.main-layout__sheet-handle span {
  width: 44px;
  height: 4px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.5);
}

.main-layout__sheet-content {
  padding: 0 var(--fp-space-4) calc(var(--fp-space-4) + env(safe-area-inset-bottom));
  overflow-y: auto;
}

@media (min-width: 1024px) {
  .main-layout__mobile {
    display: none;
  }

  .main-layout__desktop {
    display: grid;
  }
}

@media (min-width: 1200px) {
  .main-layout__toolbar {
    display: none;
  }
}
</style>
