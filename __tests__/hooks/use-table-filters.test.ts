/**
 * Tests for useTableFilters hook
 */
import { act, renderHook } from '@testing-library/react';

import { useTableFilters } from '@/hooks/use-table-filters';

interface TestFilters extends Record<string, unknown> {
  status: string[];
  dateFrom?: Date;
  dateTo?: Date;
  minAmount: number;
  maxAmount: number;
  isActive?: boolean;
}

describe('useTableFilters', () => {
  const initialFilters: TestFilters = {
    status: [],
    dateFrom: undefined,
    dateTo: undefined,
    minAmount: 0,
    maxAmount: 1000,
    isActive: undefined,
  };

  it('should initialize with provided filters', () => {
    const { result } = renderHook(() => useTableFilters(initialFilters));

    expect(result.current.filters).toEqual(initialFilters);
  });

  it('should update single filter', () => {
    const { result } = renderHook(() => useTableFilters(initialFilters));

    act(() => {
      result.current.updateFilter('status', ['active', 'pending']);
    });

    expect(result.current.filters.status).toEqual(['active', 'pending']);
    expect(result.current.filters.minAmount).toBe(0); // Other filters unchanged
  });

  it('should update multiple filters', () => {
    const { result } = renderHook(() => useTableFilters(initialFilters));

    const date = new Date('2023-01-01');

    act(() => {
      result.current.updateFilters({
        status: ['completed'],
        dateFrom: date,
        minAmount: 100,
      });
    });

    expect(result.current.filters.status).toEqual(['completed']);
    expect(result.current.filters.dateFrom).toBe(date);
    expect(result.current.filters.minAmount).toBe(100);
    expect(result.current.filters.maxAmount).toBe(1000); // Unchanged
  });

  it('should reset all filters', () => {
    const { result } = renderHook(() => useTableFilters(initialFilters));

    // Change filters
    act(() => {
      result.current.updateFilters({
        status: ['active'],
        dateFrom: new Date(),
        minAmount: 500,
        maxAmount: 2000,
        isActive: true,
      });
    });

    expect(result.current.filters.status).toEqual(['active']);
    expect(result.current.filters.minAmount).toBe(500);

    // Reset
    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filters).toEqual(initialFilters);
  });

  it('should clear specific filter', () => {
    const { result } = renderHook(() => useTableFilters(initialFilters));

    // Set some filters
    act(() => {
      result.current.updateFilters({
        status: ['active'],
        dateFrom: new Date(),
        minAmount: 500,
      });
    });

    // Clear specific filter
    act(() => {
      result.current.clearFilter('dateFrom');
    });

    expect(result.current.filters.dateFrom).toBeUndefined();
    expect(result.current.filters.status).toEqual(['active']); // Unchanged
    expect(result.current.filters.minAmount).toBe(500); // Unchanged
  });

  it('should handle undefined values', () => {
    const { result } = renderHook(() => useTableFilters(initialFilters));

    act(() => {
      result.current.updateFilter('dateFrom', new Date());
    });

    expect(result.current.filters.dateFrom).toBeInstanceOf(Date);

    act(() => {
      result.current.updateFilter('dateFrom', undefined);
    });

    expect(result.current.filters.dateFrom).toBeUndefined();
  });

  it('should handle array filters', () => {
    const { result } = renderHook(() => useTableFilters(initialFilters));

    act(() => {
      result.current.updateFilter('status', ['active']);
    });

    expect(result.current.filters.status).toEqual(['active']);

    act(() => {
      result.current.updateFilter('status', ['active', 'pending', 'completed']);
    });

    expect(result.current.filters.status).toEqual(['active', 'pending', 'completed']);

    act(() => {
      result.current.updateFilter('status', []);
    });

    expect(result.current.filters.status).toEqual([]);
  });

  it('should handle boolean filters', () => {
    const { result } = renderHook(() => useTableFilters(initialFilters));

    act(() => {
      result.current.updateFilter('isActive', true);
    });

    expect(result.current.filters.isActive).toBe(true);

    act(() => {
      result.current.updateFilter('isActive', false);
    });

    expect(result.current.filters.isActive).toBe(false);
  });

  it('should maintain state across re-renders', () => {
    const { result, rerender } = renderHook(() => useTableFilters(initialFilters));

    act(() => {
      result.current.updateFilters({
        status: ['active'],
        minAmount: 100,
      });
    });

    expect(result.current.filters.status).toEqual(['active']);
    expect(result.current.filters.minAmount).toBe(100);

    // Re-render
    rerender();

    expect(result.current.filters.status).toEqual(['active']);
    expect(result.current.filters.minAmount).toBe(100);
  });

  it('should handle complex filter updates', () => {
    const { result } = renderHook(() => useTableFilters(initialFilters));

    const date1 = new Date('2023-01-01');
    const date2 = new Date('2023-12-31');

    act(() => {
      result.current.updateFilters({
        status: ['active', 'pending'],
        dateFrom: date1,
        dateTo: date2,
        minAmount: 100,
        maxAmount: 500,
        isActive: true,
      });
    });

    expect(result.current.filters).toEqual({
      status: ['active', 'pending'],
      dateFrom: date1,
      dateTo: date2,
      minAmount: 100,
      maxAmount: 500,
      isActive: true,
    });
  });

  it('should handle partial updates', () => {
    const { result } = renderHook(() => useTableFilters(initialFilters));

    // Set initial state
    act(() => {
      result.current.updateFilters({
        status: ['active'],
        minAmount: 100,
        maxAmount: 500,
      });
    });

    // Partial update
    act(() => {
      result.current.updateFilters({
        status: ['completed'],
      });
    });

    expect(result.current.filters.status).toEqual(['completed']);
    expect(result.current.filters.minAmount).toBe(100); // Unchanged
    expect(result.current.filters.maxAmount).toBe(500); // Unchanged
  });
});
