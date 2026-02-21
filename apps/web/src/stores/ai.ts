import type { AboutMyFlows, Suggestion } from '@flow-profile/ai';
import { createDefaultAdapters, getAISuggestions } from '@flow-profile/ai';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

const STORAGE_KEY = 'flow-profile.ai.settings.v1';
const API_KEY_STORAGE_KEY = 'flow-profile.ai.apiKey.v1';

type PersistedSettings = {
  enabled: boolean;
  provider: string;
  apiKey: string;
  model: string;
  consented: boolean;
  rememberKey: boolean;
};

type StorageKind = 'local' | 'session';

const getStorage = (kind: StorageKind): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};

const safeParseSettings = (raw: string): Partial<PersistedSettings> | null => {
  try {
    return JSON.parse(raw) as Partial<PersistedSettings>;
  } catch {
    return null;
  }
};

const loadSettings = (): PersistedSettings => {
  try {
    if (typeof window === 'undefined') {
      return {
        enabled: false,
        provider: 'mock',
        apiKey: '',
        model: '',
        consented: false,
        rememberKey: false,
      };
    }
    const raw = getStorage('local')?.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        enabled: false,
        provider: 'mock',
        apiKey: '',
        model: '',
        consented: false,
        rememberKey: false,
      };
    }
    const parsed = safeParseSettings(raw);
    if (!parsed) {
      return {
        enabled: false,
        provider: 'mock',
        apiKey: '',
        model: '',
        consented: false,
        rememberKey: false,
      };
    }
    return {
      enabled: Boolean(parsed.enabled),
      provider: parsed.provider || 'mock',
      apiKey: parsed.apiKey || '',
      model: parsed.model || '',
      consented: Boolean(parsed.consented),
      rememberKey: Boolean(parsed.rememberKey),
    };
  } catch {
    return {
      enabled: false,
      provider: 'mock',
      apiKey: '',
      model: '',
      consented: false,
      rememberKey: false,
    };
  }
};

const persistSettings = (settings: PersistedSettings) => {
  const storage = getStorage('local');
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

const loadApiKey = (rememberKey: boolean): string => {
  const storage = getStorage(rememberKey ? 'local' : 'session');
  return storage?.getItem(API_KEY_STORAGE_KEY) ?? '';
};

const persistApiKey = (apiKey: string, rememberKey: boolean) => {
  const localStorageRef = getStorage('local');
  const sessionStorageRef = getStorage('session');
  if (rememberKey) {
    if (apiKey) {
      localStorageRef?.setItem(API_KEY_STORAGE_KEY, apiKey);
    } else {
      localStorageRef?.removeItem(API_KEY_STORAGE_KEY);
    }
    sessionStorageRef?.removeItem(API_KEY_STORAGE_KEY);
    return;
  }

  if (apiKey) {
    sessionStorageRef?.setItem(API_KEY_STORAGE_KEY, apiKey);
  } else {
    sessionStorageRef?.removeItem(API_KEY_STORAGE_KEY);
  }
  localStorageRef?.removeItem(API_KEY_STORAGE_KEY);
};

export const useAIStore = defineStore('ai', () => {
  const adapters = createDefaultAdapters();
  const adapterNames = Object.keys(adapters);

  const settings = loadSettings();

  const enabled = ref(settings.enabled);
  const provider = ref(settings.provider);
  const rememberKey = ref(settings.rememberKey);
  const apiKey = ref(loadApiKey(settings.rememberKey));
  if (!apiKey.value && settings.rememberKey && settings.apiKey) {
    apiKey.value = settings.apiKey;
  }
  const model = ref(settings.model);
  const consented = ref(settings.consented);

  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);
  const suggestions = ref<Suggestion[]>([]);
  const evidenceRefs = ref<string[]>([]);
  const promptUsed = ref('');
  const rawResponse = ref('');

  watch([enabled, provider, model, consented, rememberKey], () => {
    persistSettings({
      enabled: enabled.value,
      provider: provider.value,
      apiKey: '',
      model: model.value,
      consented: consented.value,
      rememberKey: rememberKey.value,
    });
  });

  watch([apiKey, rememberKey], () => {
    persistApiKey(apiKey.value, rememberKey.value);
  });

  const canRequest = computed(() => {
    if (!enabled.value) return false;
    if (!consented.value) return false;
    if (provider.value === 'mock') return true;
    return apiKey.value.length > 0;
  });

  const clearResults = () => {
    suggestions.value = [];
    evidenceRefs.value = [];
    promptUsed.value = '';
    rawResponse.value = '';
    errorMessage.value = null;
  };

  const requestSuggestions = async (bundle: AboutMyFlows | null) => {
    if (!bundle) {
      errorMessage.value = 'No bundle available yet.';
      return;
    }

    if (!canRequest.value) {
      errorMessage.value = 'AI suggestions are disabled or missing consent/api key.';
      return;
    }

    const adapter = adapters[provider.value] ?? adapters.mock;
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const result = await getAISuggestions(adapter, bundle, {
        apiKey: apiKey.value,
        model: model.value || undefined,
        timeoutMs: 10_000,
      });

      suggestions.value = result.suggestions;
      evidenceRefs.value = result.evidenceRefs;
      promptUsed.value = result.promptUsed;
      rawResponse.value = result.rawResponse;

      if (result.suggestions.length === 0 && result.rawResponse) {
        errorMessage.value = result.rawResponse;
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'An unexpected error occurred.';
    } finally {
      isLoading.value = false;
    }
  };

  return {
    adapterNames,
    apiKey,
    canRequest,
    clearResults,
    consented,
    enabled,
    evidenceRefs,
    errorMessage,
    isLoading,
    model,
    promptUsed,
    provider,
    rawResponse,
    rememberKey,
    requestSuggestions,
    suggestions,
  };
});
