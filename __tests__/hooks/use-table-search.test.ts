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
    const { result } = renderHook(() => useTableSearch({}));

    expect(result.current.inputValue).toBe('');
    expect(result.current.searchValue).toBe('');
  });

  it('should initialize with custom initial value', () => {
    const { result } = renderHook(() =>
      useTableSearch({
        initialValue: 'test query',
      })
    );

    expect(result.current.inputValue).toBe('test query');
    expect(result.current.searchValue).toBe('test query');
  });

  it('should update inputValue immediately and debounce searchValue', () => {
    const { result } = renderHook(() =>
      useTableSearch({
        debounceMs: 500,
      })
    );

    act(() => {
      result.current.setSearchValue('new query');
    });

    expect(result.current.inputValue).toBe('new query');
    expect(result.current.searchValue).toBe('');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.searchValue).toBe('new query');
  });

  it('should use custom debounce delay', () => {
    const { result } = renderHook(() =>
      useTableSearch({
        debounceMs: 500,
      })
    );

    act(() => {
      result.current.setSearchValue('test');
    });

    expect(result.current.inputValue).toBe('test');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.searchValue).toBe('');

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.searchValue).toBe('test');
  });

  it('should clear previous timer on new search', () => {
    const { result } = renderHook(() =>
      useTableSearch({
        debounceMs: 500,
      })
    );

    act(() => {
      result.current.setSearchValue('first');
    });

    expect(result.current.inputValue).toBe('first');

    act(() => {
      result.current.setSearchValue('second');
    });

    expect(result.current.inputValue).toBe('second');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.searchValue).toBe('second');
  });

  it('should clear both inputValue and searchValue', () => {
    const { result } = renderHook(() =>
      useTableSearch({
        initialValue: 'initial',
      })
    );

    expect(result.current.inputValue).toBe('initial');
    expect(result.current.searchValue).toBe('initial');

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.inputValue).toBe('');
    expect(result.current.searchValue).toBe('');
  });

  it('should handle multiple rapid changes and only apply last value', () => {
    const { result } = renderHook(() =>
      useTableSearch({
        debounceMs: 100,
      })
    );

    act(() => {
      result.current.setSearchValue('a');
      result.current.setSearchValue('ab');
      result.current.setSearchValue('abc');
    });

    // inputValue has the last value immediately
    expect(result.current.inputValue).toBe('abc');
    // searchValue not updated yet
    expect(result.current.searchValue).toBe('');

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // After debounce, only the last value is applied
    expect(result.current.searchValue).toBe('abc');
  });

  it('should maintain separate input and debounced values during typing', () => {
    const { result } = renderHook(() =>
      useTableSearch({
        debounceMs: 300,
      })
    );

    // Simulate rapid typing
    act(() => {
      result.current.setSearchValue('h');
    });
    expect(result.current.inputValue).toBe('h');
    expect(result.current.searchValue).toBe('');

    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      result.current.setSearchValue('he');
    });
    expect(result.current.inputValue).toBe('he');
    expect(result.current.searchValue).toBe(''); // Still not debounced

    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      result.current.setSearchValue('hel');
    });
    expect(result.current.inputValue).toBe('hel');
    expect(result.current.searchValue).toBe(''); // Still not debounced

    // Wait for full debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.searchValue).toBe('hel');
  });
});
