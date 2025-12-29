import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useClipboard } from '@/hooks/use-clipboard';

describe('useClipboard', () => {
  let writeTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock the clipboard API
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with isCopied as false', () => {
    const { result } = renderHook(() => useClipboard());

    expect(result.current.isCopied).toBe(false);
    expect(typeof result.current.onCopy).toBe('function');
  });

  it('should copy text to clipboard and set isCopied to true', async () => {
    const { result } = renderHook(() => useClipboard());
    const testText = 'Hello, World!';

    await act(async () => {
      await result.current.onCopy(testText);
    });

    expect(writeTextMock).toHaveBeenCalledWith(testText);
    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(result.current.isCopied).toBe(true);
  });

  it('should reset isCopied to false after 2 seconds', async () => {
    const { result } = renderHook(() => useClipboard());
    const testText = 'Test text';

    await act(async () => {
      await result.current.onCopy(testText);
    });

    expect(result.current.isCopied).toBe(true);

    // Fast-forward time by 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.isCopied).toBe(false);
  });

  it('should not reset isCopied before 2 seconds have passed', async () => {
    const { result } = renderHook(() => useClipboard());
    const testText = 'Test text';

    await act(async () => {
      await result.current.onCopy(testText);
    });

    expect(result.current.isCopied).toBe(true);

    // Fast-forward time by 1 second (less than 2 seconds)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isCopied).toBe(true);
  });
});
