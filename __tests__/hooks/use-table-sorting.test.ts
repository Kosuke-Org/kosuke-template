/**
 * Tests for useTableSorting hook
 */
import { act, renderHook } from '@testing-library/react';

import { useTableSorting } from '@/hooks/use-table-sorting';

describe('useTableSorting', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useTableSorting({
        initialSortBy: 'name',
      })
    );

    expect(result.current.sortBy).toBe('name');
    expect(result.current.sortOrder).toBe('desc');
  });

  it('should initialize with custom sort order', () => {
    const { result } = renderHook(() =>
      useTableSorting({
        initialSortBy: 'date',
        initialSortOrder: 'asc',
      })
    );

    expect(result.current.sortBy).toBe('date');
    expect(result.current.sortOrder).toBe('asc');
  });

  it('should toggle sort order for same column', () => {
    const { result } = renderHook(() =>
      useTableSorting({
        initialSortBy: 'name',
        initialSortOrder: 'desc',
      })
    );

    expect(result.current.sortBy).toBe('name');
    expect(result.current.sortOrder).toBe('desc');

    // Toggle same column
    act(() => {
      result.current.handleSort('name');
    });

    expect(result.current.sortBy).toBe('name');
    expect(result.current.sortOrder).toBe('asc');

    // Toggle again
    act(() => {
      result.current.handleSort('name');
    });

    expect(result.current.sortBy).toBe('name');
    expect(result.current.sortOrder).toBe('desc');
  });

  it('should change to new column with default sort order', () => {
    const { result } = renderHook(() =>
      useTableSorting<'name' | 'date'>({
        initialSortBy: 'name',
        initialSortOrder: 'asc',
      })
    );

    expect(result.current.sortBy).toBe('name');
    expect(result.current.sortOrder).toBe('asc');

    // Change to new column
    act(() => {
      result.current.handleSort('date');
    });

    expect(result.current.sortBy).toBe('date');
    expect(result.current.sortOrder).toBe('desc');
  });

  it('should reset to initial values', () => {
    const { result } = renderHook(() =>
      useTableSorting<'name' | 'date'>({
        initialSortBy: 'name',
        initialSortOrder: 'asc',
      })
    );

    // Change sorting
    act(() => {
      result.current.handleSort('date');
    });

    expect(result.current.sortBy).toBe('date');
    expect(result.current.sortOrder).toBe('desc');

    // Reset
    act(() => {
      result.current.resetSort();
    });

    expect(result.current.sortBy).toBe('name');
    expect(result.current.sortOrder).toBe('asc');
  });

  it('should work with different column types', () => {
    type SortColumns = 'name' | 'date' | 'amount';

    const { result } = renderHook(() =>
      useTableSorting<SortColumns>({
        initialSortBy: 'name',
        initialSortOrder: 'desc',
      })
    );

    act(() => {
      result.current.handleSort('amount');
    });

    expect(result.current.sortBy).toBe('amount');
    expect(result.current.sortOrder).toBe('desc');
  });

  it('should handle multiple rapid changes', () => {
    const { result } = renderHook(() =>
      useTableSorting<'name' | 'date' | 'amount'>({
        initialSortBy: 'name',
        initialSortOrder: 'desc',
      })
    );

    // Rapid changes - each call should update the state
    act(() => {
      result.current.handleSort('date');
    });
    expect(result.current.sortBy).toBe('date');
    expect(result.current.sortOrder).toBe('desc');

    act(() => {
      result.current.handleSort('amount');
    });
    expect(result.current.sortBy).toBe('amount');
    expect(result.current.sortOrder).toBe('desc');

    act(() => {
      result.current.handleSort('name');
    });
    expect(result.current.sortBy).toBe('name');
    expect(result.current.sortOrder).toBe('desc');
  });

  it('should maintain state across re-renders', () => {
    const { result, rerender } = renderHook(() =>
      useTableSorting<'name' | 'date'>({
        initialSortBy: 'name',
        initialSortOrder: 'desc',
      })
    );

    act(() => {
      result.current.handleSort('date');
    });

    expect(result.current.sortBy).toBe('date');
    expect(result.current.sortOrder).toBe('desc');

    // Re-render
    rerender();

    expect(result.current.sortBy).toBe('date');
    expect(result.current.sortOrder).toBe('desc');
  });
});
