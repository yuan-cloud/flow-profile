<template>
  <div v-if="open" class="command-palette" @click.self="emit('close')">
    <div
      class="command-palette__panel"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      data-testid="command-palette-dialog"
    >
      <div class="command-palette__search">
        <input
          ref="inputRef"
          v-model="query"
          class="command-palette__input"
          type="text"
          placeholder="Type a command..."
          @keydown="handleKeydown"
        />
      </div>
      <div class="command-palette__recent" v-if="showRecent">
        <p class="command-palette__section">Recent</p>
        <ul class="command-palette__list">
          <li
            v-for="(command, index) in recentDisplay"
            :key="`recent-${command.id}`"
            class="command-palette__item"
            :data-active="sectionStarts.recentStart !== null && sectionStarts.recentStart + index === activeIndex"
          >
            <button class="command-palette__button" type="button" @click="handleSelect(command.id)">
              <div>
                <p class="command-palette__label">{{ command.label }}</p>
                <p v-if="command.description" class="command-palette__description">
                  {{ command.description }}
                </p>
              </div>
              <span v-if="command.shortcut" class="command-palette__shortcut">{{ command.shortcut }}</span>
            </button>
          </li>
        </ul>
      </div>

      <div
        v-for="section in visibleSections"
        :key="section.label"
        class="command-palette__section-group"
      >
        <p class="command-palette__section">{{ section.label }}</p>
        <ul class="command-palette__list">
          <li
            v-for="(command, index) in section.items"
            :key="command.id"
            class="command-palette__item"
            :data-active="section.start + index === activeIndex"
          >
            <button class="command-palette__button" type="button" @click="handleSelect(command.id)">
              <div>
                <p class="command-palette__label">{{ command.label }}</p>
                <p v-if="command.description" class="command-palette__description">
                  {{ command.description }}
                </p>
              </div>
              <span v-if="command.shortcut" class="command-palette__shortcut">{{ command.shortcut }}</span>
            </button>
          </li>
        </ul>
      </div>
      <p v-if="sectionStarts.total === 0" class="command-palette__empty">No matching commands.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  category?: 'navigation' | 'actions' | 'settings';
};

const props = defineProps<{
  open: boolean;
  commands: CommandItem[];
}>();

const emit = defineEmits<{
  close: [];
  select: [id: string];
}>();

const query = ref('');
const activeIndex = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);
const recentCommands = ref<CommandItem[]>([]);

const RECENT_KEY = 'fp.command.recent';
const MAX_RECENT = 4;

const normalizedCommands = computed(() => (Array.isArray(props.commands) ? props.commands : []));

const recentDisplay = computed(() => {
  const byId = new Map(normalizedCommands.value.map((command) => [command.id, command]));
  return recentCommands.value
    .map((command) => byId.get(command.id))
    .filter((command): command is CommandItem => Boolean(command));
});

const showRecent = computed(
  () => query.value.trim().length === 0 && recentDisplay.value.length > 0,
);

const filteredCommands = computed(() => {
  const value = query.value.trim().toLowerCase();
  if (!value) return normalizedCommands.value;
  const scored = normalizedCommands.value
    .map((command) => {
      const label = command.label.toLowerCase();
      const description = command.description?.toLowerCase() ?? '';
      const contains = label.includes(value) || description.includes(value);
      const distance = fuzzyDistance(value, label);
      return { command, contains, distance };
    })
    .filter((entry) => entry.contains || entry.distance < value.length);
  scored.sort((a, b) => a.distance - b.distance);
  return scored.map((entry) => entry.command);
});

const categorySections = computed(() => {
  const categories: Array<{ key: 'navigation' | 'actions' | 'settings'; label: string }> = [
    { key: 'navigation', label: 'Navigation' },
    { key: 'actions', label: 'Actions' },
    { key: 'settings', label: 'Settings' },
  ];
  const withCategory = categories.map((category) => ({
    ...category,
    items: filteredCommands.value.filter((command) => command.category === category.key),
  }));
  const uncategorized = filteredCommands.value.filter(
    (command) => !categories.some((category) => category.key === command.category),
  );
  return uncategorized.length
    ? [...withCategory, { key: 'other', label: 'Other', items: uncategorized }]
    : withCategory;
});

const sectionStarts = computed(() => {
  let index = 0;
  const recentStart = showRecent.value ? 0 : null;
  if (showRecent.value) index += recentDisplay.value.length;
  const sections = categorySections.value.map((section) => {
    const safeItems = Array.isArray(section.items) ? section.items : [];
    const start = index;
    index += safeItems.length;
    return { ...section, items: safeItems, start };
  });
  return { recentStart, sections, total: index };
});

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const visibleSections = computed(() =>
  sectionStarts.value.sections.filter(
    (section) => Array.isArray(section.items) && section.items.length > 0,
  ),
);

const visibleCommands = computed(() => {
  const list: CommandItem[] = [];
  if (showRecent.value) list.push(...recentDisplay.value);
  for (const section of sectionStarts.value.sections) {
    if (Array.isArray(section.items)) list.push(...section.items);
  }
  return list;
});

const handleSelect = (id: string) => {
  const selected = normalizedCommands.value.find((command) => command.id === id);
  if (selected) updateRecent(selected);
  emit('select', id);
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleKeydown = (event: KeyboardEvent) => {
  const total = visibleCommands.value.length;
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('close');
    return;
  }
  if (event.key === 'ArrowDown') {
    if (total === 0) return;
    event.preventDefault();
    activeIndex.value = Math.min(activeIndex.value + 1, total - 1);
    return;
  }
  if (event.key === 'ArrowUp') {
    if (total === 0) return;
    event.preventDefault();
    activeIndex.value = Math.max(activeIndex.value - 1, 0);
    return;
  }
  if (event.key === 'Enter') {
    if (total === 0) return;
    event.preventDefault();
    const command = visibleCommands.value[activeIndex.value];
    if (command) handleSelect(command.id);
  }
};

watch(
  () => props.open,
  async (value) => {
    if (value) {
      query.value = '';
      activeIndex.value = 0;
      await nextTick();
      inputRef.value?.focus();
    }
  },
);

watch(
  () => query.value,
  () => {
    activeIndex.value = 0;
  },
);

watch(
  () => sectionStarts.value.total,
  (total) => {
    if (total === 0) {
      activeIndex.value = 0;
      return;
    }
    if (activeIndex.value > total - 1) activeIndex.value = total - 1;
  },
);

const updateRecent = (command: CommandItem) => {
  const next = [command, ...recentCommands.value.filter((item) => item.id !== command.id)];
  recentCommands.value = next.slice(0, MAX_RECENT);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(recentCommands.value));
  }
};

const loadRecent = () => {
  if (typeof window === 'undefined') return;
  const raw = window.localStorage.getItem(RECENT_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as CommandItem[];
    if (Array.isArray(parsed)) recentCommands.value = parsed;
  } catch {
    // ignore
  }
};

const fuzzyDistance = (queryValue: string, text: string) => {
  let distance = 0;
  let lastIndex = -1;
  for (const char of queryValue) {
    const index = text.indexOf(char, lastIndex + 1);
    if (index === -1) return Number.POSITIVE_INFINITY;
    distance += index - lastIndex;
    lastIndex = index;
  }
  return distance;
};

loadRecent();
</script>

<style scoped>
.command-palette {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 80px 20px;
  background: rgba(2, 6, 23, 0.6);
  backdrop-filter: blur(6px);
  z-index: 50;
}

.command-palette__panel {
  width: min(560px, 100%);
  background: rgba(15, 23, 42, 0.98);
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 20px 40px rgba(2, 6, 23, 0.45);
  overflow: hidden;
}

.command-palette__search {
  padding: 16px 18px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.command-palette__input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: #e2e8f0;
  font-size: 14px;
}

.command-palette__list {
  list-style: none;
  padding: 12px;
  margin: 0;
  display: grid;
  gap: 8px;
}

.command-palette__recent {
  padding: 12px 12px 0;
}

.command-palette__section-group {
  padding: 12px 12px 0;
}

.command-palette__section {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #94a3b8;
  margin: 0 0 8px;
}

.command-palette__item {
  border-radius: 14px;
  border: 1px solid transparent;
}

.command-palette__item[data-active='true'] {
  border-color: rgba(56, 189, 248, 0.6);
  background: rgba(15, 23, 42, 0.7);
}

.command-palette__button {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: transparent;
  border: none;
  color: inherit;
  text-align: left;
  padding: 10px 12px;
  cursor: pointer;
}

.command-palette__label {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.command-palette__description {
  margin: 2px 0 0;
  font-size: 11px;
  color: #94a3b8;
}

.command-palette__shortcut {
  font-size: 11px;
  color: #e2e8f0;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.6);
}

.command-palette__empty {
  padding: 16px 18px;
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
}
</style>
