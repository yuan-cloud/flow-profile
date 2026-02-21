import { describe, expect, it, vi } from 'vitest';

import { useClipboard } from './useClipboard';

const mockWriteText = vi.fn();

const withClipboard = (fn: () => Promise<void> | void) => {
  const original = navigator.clipboard;
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: mockWriteText },
    writable: true,
    configurable: true,
  });
  const result = fn();
  const restore = () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: original,
      writable: true,
      configurable: true,
    });
    mockWriteText.mockReset();
  };
  if (result instanceof Promise) {
    return result.finally(restore);
  }
  restore();
  return result;
};

const withoutClipboard = (fn: () => Promise<void> | void) => {
  const original = navigator.clipboard;
  Object.defineProperty(navigator, 'clipboard', {
    value: undefined,
    writable: true,
    configurable: true,
  });
  const result = fn();
  const restore = () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: original,
      writable: true,
      configurable: true,
    });
  };
  if (result instanceof Promise) {
    return result.finally(restore);
  }
  restore();
  return result;
};

describe('useClipboard', () => {
  it('starts in idle status', () => {
    const { status } = useClipboard();
    expect(status.value).toBe('idle');
  });

  it('copy returns true and sets success on clipboard write', () =>
    withClipboard(async () => {
      mockWriteText.mockResolvedValue(undefined);
      const { copy, status } = useClipboard();

      const result = await copy('hello');

      expect(result).toBe(true);
      expect(status.value).toBe('success');
      expect(mockWriteText).toHaveBeenCalledWith('hello');
    }));

  it('copy returns false and sets error on clipboard failure', () =>
    withClipboard(async () => {
      mockWriteText.mockRejectedValue(new Error('denied'));
      const { copy, status } = useClipboard();

      const result = await copy('secret');

      expect(result).toBe(false);
      expect(status.value).toBe('error');
    }));

  it('copy returns false when clipboard API is unavailable', () =>
    withoutClipboard(async () => {
      const { copy, status } = useClipboard();

      const result = await copy('text');

      expect(result).toBe(false);
      expect(status.value).toBe('error');
    }));

  it('reset returns status to idle', () =>
    withClipboard(async () => {
      mockWriteText.mockResolvedValue(undefined);
      const { copy, reset, status } = useClipboard();

      await copy('test');
      expect(status.value).toBe('success');

      reset();
      expect(status.value).toBe('idle');
    }));

  it('reset from error returns to idle', () =>
    withoutClipboard(async () => {
      const { copy, reset, status } = useClipboard();

      await copy('text');
      expect(status.value).toBe('error');

      reset();
      expect(status.value).toBe('idle');
    }));
});
