/**
 * Tests for useTableSearch hook
 */
import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';

import { useTableSearch } from '@/hooks/use-table-search';

// Mock timers for debounce testing
vi.useFakeTimers();

describe('useTableSearch', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
  });

  it('should initialize with default values', () => {
    const onSearchChange = vi.fn();
    const { result } = renderHook(() =>
      useTableSearch({
        onSearchChange,
      })
    );

    expect(result.current.searchValue).toBe('');
  });

  it('should initialize with custom initial value', () => {
    const onSearchChange = vi.fn();
    const { result } = renderHook(() =>
      useTableSearch({
        initialValue: 'test query',
        onSearchChange,
      })
    );

    expect(result.current.searchValue).toBe('test query');
  });

  it('should debounce search changes', () => {
    const onSearchChange = vi.fn();
    const { result } = renderHook(() =>
      useTableSearch({
        debounceMs: 500,
        onSearchChange,
      })
    );

    act(() => {
      result.current.setSearchValue('new query');
    });

    expect(onSearchChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onSearchChange).toHaveBeenCalledWith('new query');
    expect(onSearchChange).toHaveBeenCalledTimes(1);
  });

  it('should use custom debounce delay', () => {
    const onSearchChange = vi.fn();
    const { result } = renderHook(() =>
      useTableSearch({
        debounceMs: 500,
        onSearchChange,
      })
    );

    act(() => {
      result.current.setSearchValue('test');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onSearchChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onSearchChange).toHaveBeenCalledWith('test');
  });

  it('should clear previous timer on new search', () => {
    const onSearchChange = vi.fn();
    const { result } = renderHook(() =>
      useTableSearch({
        debounceMs: 500,
        onSearchChange,
      })
    );

    act(() => {
      result.current.setSearchValue('first');
    });

    act(() => {
      result.current.setSearchValue('second');
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith('second');
  });

  it('should clear search value', () => {
    const onSearchChange = vi.fn();
    const { result } = renderHook(() =>
      useTableSearch({
        initialValue: 'initial',
        onSearchChange,
      })
    );

    expect(result.current.searchValue).toBe('initial');

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.searchValue).toBe('');
  });

  it('should call onSearchChange when clearing search', () => {
    const onSearchChange = vi.fn();
    const { result } = renderHook(() =>
      useTableSearch({
        initialValue: 'initial',
        onSearchChange,
      })
    );

    act(() => {
      result.current.clearSearch();
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('should handle multiple rapid changes', () => {
    const onSearchChange = vi.fn();
    const { result } = renderHook(() =>
      useTableSearch({
        debounceMs: 100,
        onSearchChange,
      })
    );

    act(() => {
      result.current.setSearchValue('a');
      result.current.setSearchValue('ab');
      result.current.setSearchValue('abc');
    });

    expect(onSearchChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith('abc');
  });
});
