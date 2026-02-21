import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAnnounce } from '@/composables/useAnnounce';

describe('useAnnounce', () => {
  let liveRegion: HTMLElement;

  beforeEach(() => {
    liveRegion = { textContent: '' } as unknown as HTMLElement;

    // Use vi.stubGlobal so cleanup is automatic via vi.unstubAllGlobals()
    vi.stubGlobal('document', {
      getElementById: vi.fn((id: string) => {
        if (id === 'app-live-region') return liveRegion;
        return null;
      }),
    });

    vi.stubGlobal('window', {
      setTimeout: vi.fn((fn: () => void) => {
        fn();
        return 0;
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sets textContent on the live region element', () => {
    const { announce } = useAnnounce();
    announce('Hello world');
    expect(liveRegion.textContent).toBe('Hello world');
  });

  it('clears textContent before setting for re-announcement', () => {
    const { announce } = useAnnounce();
    const calls: string[] = [];

    Object.defineProperty(liveRegion, 'textContent', {
      get: () => calls[calls.length - 1] ?? '',
      set: (v: string) => calls.push(v),
    });

    announce('First');
    // Should have cleared then set: '' then 'First'
    expect(calls).toEqual(['', 'First']);
  });

  it('does nothing with empty message', () => {
    const { announce } = useAnnounce();
    announce('');
    expect(liveRegion.textContent).toBe('');
  });

  it('does nothing when live region is missing', () => {
    (document.getElementById as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const { announce } = useAnnounce();
    expect(() => announce('Test')).not.toThrow();
  });

  it('does nothing when document is unavailable', () => {
    vi.unstubAllGlobals();
    const { announce } = useAnnounce();
    expect(() => announce('Test')).not.toThrow();
  });
});
