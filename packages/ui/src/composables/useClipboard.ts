import { ref } from 'vue';

export const useClipboard = () => {
  const status = ref<'idle' | 'success' | 'error'>('idle');

  const copy = async (text: string) => {
    if (!navigator?.clipboard) {
      status.value = 'error';
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      status.value = 'success';
      return true;
    } catch {
      status.value = 'error';
      return false;
    }
  };

  const reset = () => {
    status.value = 'idle';
  };

  return {
    copy,
    reset,
    status,
  };
};
