<template>
  <section
    class="fp-entrance group relative overflow-hidden rounded-fp-3xl border border-slate-800 bg-slate-950/[var(--fp-opacity-prominent)] p-8 shadow-2xl"
  >
    <div
      class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_65%)]"
    ></div>

    <div
      class="flex flex-col items-center gap-3 rounded-fp-2xl border border-dashed px-6 py-10 text-center transition fp-touch-target"
      :class="dropZoneClasses"
      role="button"
      tabindex="0"
      aria-label="Upload Node-RED flow JSON"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
      @keydown.enter.prevent="openFilePicker"
      @keydown.space.prevent="openFilePicker"
      @click="openFilePicker"
    >
      <div
        class="flex h-14 w-14 items-center justify-center rounded-fp-2xl border border-slate-700 bg-slate-900/[var(--fp-opacity-prominent)] text-emerald-300"
      >
        <Upload :size="24" :stroke-width="2" aria-hidden="true" />
      </div>
      <div>
        <h2 class="text-xl font-semibold text-white">Drop flows.json here</h2>
        <p class="mt-2 text-sm text-slate-300">
          or
          <span class="font-semibold text-emerald-200 underline underline-offset-2 decoration-emerald-400/40">browse your files</span>
        </p>
      </div>
      <p class="text-xs text-fp-text-muted">
        Export from Node-RED: Menu -> Export -> Download
      </p>
      <div v-if="dragMessage" class="mt-3 rounded-fp-full border px-3 py-1 text-[11px]" :class="dragMessageClass">
        {{ dragMessage }}
      </div>
      <div class="mt-2 flex items-center gap-2">
        <span class="text-xs text-fp-text-muted">or</span>
        <button
          data-testid="sample-flow-button"
          class="rounded-fp-full border border-slate-700 bg-slate-900/[var(--fp-opacity-prominent)] px-4 py-1.5 text-xs text-slate-200 transition hover:border-emerald-400 hover:text-emerald-200 fp-touch-target"
          type="button"
          @click.stop="loadSample"
        >
          Try with a sample flow
        </button>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept=".json,application/json"
      multiple
      hidden
      @change="onFileSelect"
    />

    <p
      v-if="errorMessage"
      data-testid="dropzone-error"
      class="mt-4 rounded-fp-xl border border-rose-500/[var(--fp-opacity-default)] bg-rose-500/[var(--fp-opacity-subtle)] p-3 text-sm text-rose-100"
      role="alert"
    >
      {{ errorMessage }}
    </p>
    <p
      v-else-if="noticeMessage"
      data-testid="dropzone-notice"
      class="mt-4 rounded-fp-xl border border-sky-500/[var(--fp-opacity-default)] bg-sky-500/[var(--fp-opacity-subtle)] p-3 text-sm text-sky-100"
      role="status"
    >
      {{ noticeMessage }}
    </p>
  </section>
</template>

<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in template.
import { Upload } from 'lucide-vue-next';
import { computed, ref } from 'vue';

import { sampleFlow } from '@/data/sample-flow';
import { useFlowStore } from '@/stores/flow';
import { parseJsonSafe } from '@/utils/errorHandling';

const flowStore = useFlowStore();

const fileInput = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);
const isDragInvalid = ref(false);
const dragDepth = ref(0);
const dragCount = ref(0);
const errorMessage = ref<string | null>(null);
const noticeMessage = ref<string | null>(null);

const MAX_FILE_BYTES = 5 * 1024 * 1024;

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const dropZoneClasses = computed(() => {
  if (isDragInvalid.value) {
    return 'border-rose-400/[var(--fp-opacity-prominent)] bg-rose-500/[var(--fp-opacity-subtle)] text-rose-100 scale-[1.01]';
  }
  if (isDragOver.value) {
    return 'border-emerald-400/[var(--fp-opacity-prominent)] bg-emerald-500/[var(--fp-opacity-subtle)] text-emerald-100 scale-[1.01]';
  }
  return 'border-slate-700/[var(--fp-opacity-prominent)] bg-slate-900/[var(--fp-opacity-default)] text-slate-200 hover:border-emerald-400/[var(--fp-opacity-default)]';
});

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const dragMessage = computed(() => {
  if (!isDragOver.value) return '';
  if (isDragInvalid.value) return 'Invalid file type. Drop a .json export.';
  if (dragCount.value > 1) return `Drop to import the first of ${dragCount.value} files`;
  return 'Drop to import flows.json';
});

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const dragMessageClass = computed(() =>
  isDragInvalid.value
    ? 'border-rose-400/[var(--fp-opacity-prominent)] text-rose-100 bg-rose-500/[var(--fp-opacity-subtle)]'
    : 'border-emerald-400/[var(--fp-opacity-default)] text-emerald-100 bg-emerald-500/[var(--fp-opacity-subtle)]',
);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const openFilePicker = () => {
  fileInput.value?.click();
};

const resetError = () => {
  errorMessage.value = null;
};

const resetNotice = () => {
  noticeMessage.value = null;
};

const setError = (message: string) => {
  errorMessage.value = message;
};

const setNotice = (message: string) => {
  noticeMessage.value = message;
};

const readFileText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsText(file);
  });
};

const isJsonFile = (file: File): boolean => {
  if (file.type === 'application/json') return true;
  return file.name.toLowerCase().endsWith('.json');
};

const updateDragState = (event: DragEvent) => {
  const items = Array.from(event.dataTransfer?.items ?? []);
  const files = Array.from(event.dataTransfer?.files ?? []);
  const itemFiles = items.filter((item) => item.kind === 'file');
  dragCount.value = files.length || itemFiles.length;

  if (dragCount.value === 0) {
    isDragInvalid.value = false;
    return;
  }

  const hasJsonFile = files.some(isJsonFile);
  const hasJsonType = itemFiles.some((item) => item.type === 'application/json');
  const hasUnknownType = itemFiles.some((item) => item.type === '');

  isDragInvalid.value = !(hasJsonFile || hasJsonType || hasUnknownType);
};

const isNodeRedFlow = (value: unknown): boolean => {
  if (!Array.isArray(value)) return false;
  return value.some(
    (node) => typeof node === 'object' && node !== null && 'id' in node && 'type' in node,
  );
};

const handleFile = async (file: File) => {
  resetError();
  resetNotice();

  if (!isJsonFile(file)) {
    setError("This doesn't look like JSON. Please choose a .json export from Node-RED.");
    return;
  }

  if (file.size > MAX_FILE_BYTES) {
    setError('File is too large. Consider using the CLI for very large flows.');
    return;
  }

  let rawText = '';
  try {
    rawText = await readFileText(file);
  } catch {
    setError("Couldn't read that file. Please try again.");
    return;
  }

  const parsedResult = parseJsonSafe(rawText);
  if (!parsedResult.ok) {
    setError("This doesn't look like JSON. Please check the file format.");
    return;
  }
  const parsed = parsedResult.value;

  if (!isNodeRedFlow(parsed)) {
    setError("This doesn't look like a Node-RED flow. Export using Menu -> Export -> Download.");
    return;
  }

  await flowStore.loadFlow(rawText);
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const onDragEnter = (event: DragEvent) => {
  dragDepth.value += 1;
  isDragOver.value = true;
  updateDragState(event);
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const onDragOver = (event: DragEvent) => {
  isDragOver.value = true;
  updateDragState(event);
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = isDragInvalid.value ? 'none' : 'copy';
  }
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const onDragLeave = () => {
  dragDepth.value = Math.max(dragDepth.value - 1, 0);
  if (dragDepth.value === 0) {
    isDragOver.value = false;
    isDragInvalid.value = false;
    dragCount.value = 0;
  }
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const onDrop = async (event: DragEvent) => {
  isDragOver.value = false;
  isDragInvalid.value = false;
  dragDepth.value = 0;
  dragCount.value = 0;
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (!files.length) return;
  const jsonFile = files.find(isJsonFile);
  if (!jsonFile) {
    setError("This doesn't look like JSON. Please choose a .json export from Node-RED.");
    return;
  }
  if (files.length > 1) {
    setNotice(`Multiple files detected. Using ${jsonFile.name}.`);
  }
  await handleFile(jsonFile);
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const onFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const files = Array.from(target?.files ?? []);
  const file = files[0];
  if (!file) return;
  if (files.length > 1) {
    setNotice(`Multiple files detected. Using ${file.name}.`);
  }
  await handleFile(file);
  if (target) target.value = '';
};

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const loadSample = async () => {
  resetError();
  resetNotice();
  const sampleJson = JSON.stringify(sampleFlow, null, 2);
  await flowStore.loadFlow(sampleJson);
};
</script>
