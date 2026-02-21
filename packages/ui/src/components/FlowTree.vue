<template>
  <div class="flow-tree">
    <div class="flow-tree__header">
      <p class="flow-tree__title">Flow Tree</p>
      <p class="flow-tree__count">{{ items.length }} nodes</p>
    </div>
    <ul class="flow-tree__list">
      <li v-for="(item, index) in items" :key="item.id" class="flow-tree__item">
        <button
          ref="itemButtons"
          class="flow-tree__button"
          type="button"
          @click="handleSelect(item.id)"
          @contextmenu.prevent="openMenu(item, $event)"
          @keydown="handleKeydown(index, $event)"
        >
          <span class="flow-tree__dot" :data-category="item.category ?? 'logic'"></span>
          <span class="flow-tree__label">{{ item.label }}</span>
        </button>
        <button
          v-if="allowExclude"
          class="flow-tree__exclude"
          type="button"
          :aria-pressed="excludedIds?.has(item.id)"
          @click="handleExclude(item.id)"
        >
          {{ excludedIds?.has(item.id) ? 'Include' : 'Exclude' }}
        </button>
      </li>
    </ul>
    <div v-if="menuOpen" class="flow-tree__menu-backdrop" @click="closeMenu"></div>
    <div
      v-if="menuOpen"
      class="flow-tree__menu"
      role="menu"
      :style="{ left: `${menuPosition.x}px`, top: `${menuPosition.y}px` }"
    >
      <button class="flow-tree__menu-item" type="button" role="menuitem" @click="handleCopy">
        Copy node
      </button>
      <button
        v-if="menuTarget?.hasChildren"
        class="flow-tree__menu-item"
        type="button"
        role="menuitem"
        @click="handleToggleCollapse"
      >
        {{ collapsedIds?.has(menuTarget.id) ? 'Expand' : 'Collapse' }}
      </button>
      <button
        v-if="allowExclude && menuTarget"
        class="flow-tree__menu-item"
        type="button"
        role="menuitem"
        @click="handleExclude(menuTarget.id)"
      >
        {{ excludedIds?.has(menuTarget.id) ? 'Include' : 'Exclude' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

export type FlowTreeItem = {
  id: string;
  label: string;
  category?: 'input' | 'output' | 'logic' | 'config' | 'subflow';
  hasChildren?: boolean;
};

const props = withDefaults(
  defineProps<{
    items: FlowTreeItem[];
    excludedIds?: Set<string>;
    allowExclude?: boolean;
    collapsedIds?: Set<string>;
  }>(),
  {
    excludedIds: () => new Set(),
    allowExclude: false,
    collapsedIds: () => new Set(),
  },
);

const emit = defineEmits<{
  select: [string];
  exclude: [string];
  copy: [string];
  expand: [string];
  collapse: [string];
}>();

const itemButtons = ref<HTMLButtonElement[]>([]);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleSelect = (id: string) => {
  emit('select', id);
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleExclude = (id: string) => {
  emit('exclude', id);
};

const menuOpen = ref(false);
const menuTarget = ref<FlowTreeItem | null>(null);
const menuPosition = ref({ x: 0, y: 0 });

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const openMenu = (item: FlowTreeItem, event: MouseEvent) => {
  menuTarget.value = item;
  menuPosition.value = { x: event.clientX, y: event.clientY };
  menuOpen.value = true;
};

const closeMenu = () => {
  menuOpen.value = false;
  menuTarget.value = null;
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleCopy = async () => {
  if (!menuTarget.value) return;
  const value = menuTarget.value.label || menuTarget.value.id;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore clipboard failures
    }
  }
  emit('copy', menuTarget.value.id);
  closeMenu();
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleToggleCollapse = () => {
  if (!menuTarget.value) return;
  if (props.collapsedIds?.has(menuTarget.value.id)) {
    emit('expand', menuTarget.value.id);
  } else {
    emit('collapse', menuTarget.value.id);
  }
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
  if (target?.closest('.flow-tree__menu')) return;
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

const focusButton = (index: number) => {
  const button = itemButtons.value[index];
  if (!button) return;
  button.focus();
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleKeydown = (index: number, event: KeyboardEvent) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    focusButton(Math.min(index + 1, itemButtons.value.length - 1));
    return;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    focusButton(Math.max(index - 1, 0));
    return;
  }
  if (event.key === 'Home') {
    event.preventDefault();
    focusButton(0);
    return;
  }
  if (event.key === 'End') {
    event.preventDefault();
    focusButton(itemButtons.value.length - 1);
  }
};
</script>

<style scoped>
.flow-tree {
  display: grid;
  gap: var(--fp-space-2-5);
  padding: var(--fp-space-4);
  border-radius: var(--fp-radius-2xl);
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
}

.flow-tree__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--fp-space-2);
}

.flow-tree__title {
  font-weight: 600;
}

.flow-tree__count {
  font-size: 12px;
  color: var(--fp-text-muted);
}

.flow-tree__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: var(--fp-space-2);
}

.flow-tree__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--fp-space-2);
}

.flow-tree__button {
  display: flex;
  align-items: center;
  gap: var(--fp-space-2);
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  text-align: left;
  font: inherit;
}

.flow-tree__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--fp-radius-full);
  background: #94a3b8;
}

.flow-tree__dot[data-category='input'] {
  background: #22d3ee;
}

.flow-tree__dot[data-category='output'] {
  background: #34d399;
}

.flow-tree__dot[data-category='subflow'] {
  background: #a855f7;
}

.flow-tree__exclude {
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.4);
  color: inherit;
  padding: var(--fp-space-1) var(--fp-space-2);
  border-radius: var(--fp-radius-lg);
  font-size: 11px;
  cursor: pointer;
}

.flow-tree__menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
}

.flow-tree__menu {
  position: fixed;
  z-index: 31;
  min-width: 160px;
  background: rgba(15, 23, 42, 0.98);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: var(--fp-radius-xl);
  padding: var(--fp-space-2);
  display: grid;
  gap: var(--fp-space-1);
  box-shadow: 0 16px 30px rgba(2, 6, 23, 0.45);
}

.flow-tree__menu-item {
  background: transparent;
  border: none;
  color: inherit;
  text-align: left;
  padding: var(--fp-space-1) var(--fp-space-2);
  border-radius: var(--fp-radius-lg);
  font-size: 12px;
  cursor: pointer;
}

.flow-tree__menu-item:hover {
  background: rgba(148, 163, 184, 0.16);
}
</style>
