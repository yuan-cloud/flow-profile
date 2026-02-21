<template>
  <div :class="wrapperClasses">
    <!-- Label -->
    <label v-if="label" :for="inputId" :class="labelClasses">
      {{ label }}
      <span v-if="required" class="text-fp-error ml-0.5">*</span>
    </label>

    <!-- Input wrapper -->
    <div class="relative">
      <!-- Leading icon -->
      <div v-if="iconLeft" class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <FpIcon :name="iconLeft" size="sm" class="text-fp-text-muted" decorative />
      </div>

      <!-- Input element -->
      <input
        :id="inputId"
        ref="inputRef"
        v-model="modelValue"
        :type="type"
        :name="name"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :autocomplete="autocomplete"
        :aria-invalid="hasError"
        :aria-describedby="helperId"
        :class="inputClasses"
        @blur="emit('blur', $event)"
        @focus="emit('focus', $event)"
      />

      <!-- Trailing icon or clear button -->
      <div v-if="iconRight || (clearable && modelValue)" class="absolute inset-y-0 right-0 flex items-center pr-3">
        <button
          v-if="clearable && modelValue"
          type="button"
          aria-label="Clear input"
          class="text-fp-text-muted hover:text-fp-text-secondary focus:outline-none"
          @click="handleClear"
        >
          <FpIcon name="X" size="sm" label="Clear" :decorative="false" />
        </button>
        <FpIcon v-else-if="iconRight" :name="iconRight" size="sm" class="text-fp-text-muted" decorative />
      </div>
    </div>

    <!-- Helper text / Error message -->
    <p v-if="helperText || errorMessage" :id="helperId" :class="helperClasses">
      {{ errorMessage || helperText }}
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * FpInput - Flow Profile Input Component
 *
 * A text input with support for labels, icons, validation, and helper text.
 *
 * Usage:
 *   <FpInput v-model="email" label="Email" type="email" required />
 *   <FpInput v-model="search" placeholder="Search..." icon-left="Search" clearable />
 */

import { computed, ref, useId } from 'vue';
// biome-ignore lint/correctness/noUnusedImports: used in template.
import { FpIcon } from '@/components/icons';

type IconName = string;

const props = withDefaults(
  defineProps<{
    /** v-model binding */
    modelValue?: string;
    /** Input type */
    type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';
    /** Input name attribute */
    name?: string;
    /** Label text */
    label?: string;
    /** Placeholder text */
    placeholder?: string;
    /** Size preset */
    size?: 'sm' | 'md' | 'lg';
    /** Disabled state */
    disabled?: boolean;
    /** Readonly state */
    readonly?: boolean;
    /** Required field */
    required?: boolean;
    /** Autocomplete attribute */
    autocomplete?: string;
    /** Icon on the left */
    iconLeft?: IconName;
    /** Icon on the right */
    iconRight?: IconName;
    /** Show clear button when has value */
    clearable?: boolean;
    /** Helper text below input */
    helperText?: string;
    /** Error message (shows error state) */
    errorMessage?: string;
    /** Full width */
    fullWidth?: boolean;
  }>(),
  {
    type: 'text',
    size: 'md',
    disabled: false,
    readonly: false,
    required: false,
    clearable: false,
    fullWidth: true,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  blur: [event: FocusEvent];
  focus: [event: FocusEvent];
}>();

const inputRef = ref<HTMLInputElement | null>(null);
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const inputId = `fp-input-${useId()}`;
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const helperId = `fp-input-helper-${useId()}`;

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const modelValue = computed({
  get: () => props.modelValue ?? '',
  set: (value: string) => emit('update:modelValue', value),
});

const hasError = computed(() => !!props.errorMessage);

// biome-ignore lint/correctness/noUnusedVariables: used in template.
const handleClear = () => {
  emit('update:modelValue', '');
  inputRef.value?.focus();
};

// Wrapper classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const wrapperClasses = computed(() => ['fp-input-wrapper', props.fullWidth && 'w-full']);

// Label classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const labelClasses = computed(() => [
  'block text-sm font-medium mb-1.5',
  hasError.value ? 'text-fp-error-text' : 'text-fp-text-secondary',
]);

// Input classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const inputClasses = computed(() => {
  const sizeClasses = {
    sm: 'h-8 text-sm px-3',
    md: 'h-10 text-sm px-3',
    lg: 'h-12 text-base px-4',
  };

  return [
    // Base
    'w-full rounded-fp-lg bg-fp-surface-sunken',
    'text-fp-text-primary placeholder:text-fp-text-muted',
    'border transition-colors duration-fp-fast',
    // Size
    sizeClasses[props.size],
    // Icon padding
    props.iconLeft && 'pl-10',
    (props.iconRight || props.clearable) && 'pr-10',
    // States
    hasError.value
      ? 'border-fp-error focus:border-fp-error focus:ring-2 focus:ring-fp-error/[var(--fp-opacity-subtle)]'
      : 'border-fp-border-default focus:border-fp-border-focus focus:ring-2 focus:ring-fp-border-focus/[var(--fp-opacity-subtle)]',
    // Disabled
    'disabled:bg-fp-surface-base disabled:text-fp-text-disabled disabled:cursor-not-allowed',
    // Focus
    'focus:outline-none',
  ];
});

// Helper text classes
// biome-ignore lint/correctness/noUnusedVariables: used in template.
const helperClasses = computed(() => [
  'mt-1.5 text-xs',
  hasError.value ? 'text-fp-error-text' : 'text-fp-text-muted',
]);

// Expose focus method
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
});
</script>
