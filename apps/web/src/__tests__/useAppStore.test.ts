import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAppStore } from '@/stores/app';

describe('useAppStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('has correct default web version', () => {
    const store = useAppStore();
    expect(store.webVersion).toBe('0.0.1');
  });

  it('has correct core version from package', () => {
    const store = useAppStore();
    expect(store.coreVersion).toBe('0.0.1');
  });

  it('computes versionLabel from both versions', () => {
    const store = useAppStore();
    expect(store.versionLabel).toBe('web 0.0.1 · core 0.0.1');
  });
});
