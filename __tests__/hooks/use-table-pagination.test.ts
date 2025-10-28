/**
 * Tests for useTablePagination hook
 */

import { renderHook, act } from '@testing-library/react';
import { useTablePagination } from '@/hooks/use-table-pagination';

describe('useTablePagination', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useTablePagination());

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
  });

  it('should initialize with custom values', () => {
    const { result } = renderHook(() =>
      useTablePagination({
        initialPage: 3,
        initialPageSize: 25,
      })
    );

    expect(result.current.page).toBe(3);
    expect(result.current.pageSize).toBe(25);
  });

  it('should change page', () => {
    const { result } = renderHook(() =>
      useTablePagination({
        initialPage: 1,
        initialPageSize: 10,
      })
    );

    expect(result.current.page).toBe(1);

    act(() => {
      result.current.setPage(5);
    });

    expect(result.current.page).toBe(5);
  });

  it('should change page size and reset to page 1', () => {
    const { result } = renderHook(() =>
      useTablePagination({
        initialPage: 5,
        initialPageSize: 10,
      })
    );

    expect(result.current.page).toBe(5);
    expect(result.current.pageSize).toBe(10);

    act(() => {
      result.current.setPageSize(25);
    });

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(25);
  });

  it('should reset pagination to initial values', () => {
    const { result } = renderHook(() =>
      useTablePagination({
        initialPage: 1,
        initialPageSize: 10,
      })
    );

    // Change values
    act(() => {
      result.current.setPage(5);
      result.current.setPageSize(25);
    });

    expect(result.current.page).toBe(1); // Reset by setPageSize
    expect(result.current.pageSize).toBe(25);

    // Reset
    act(() => {
      result.current.resetPagination();
    });

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
  });

  it('should go to first page', () => {
    const { result } = renderHook(() =>
      useTablePagination({
        initialPage: 5,
        initialPageSize: 10,
      })
    );

    expect(result.current.page).toBe(5);

    act(() => {
      result.current.goToFirstPage();
    });

    expect(result.current.page).toBe(1);
  });

  it('should handle multiple page changes', () => {
    const { result } = renderHook(() =>
      useTablePagination({
        initialPage: 1,
        initialPageSize: 10,
      })
    );

    act(() => {
      result.current.setPage(3);
      result.current.setPage(7);
      result.current.setPage(2);
    });

    expect(result.current.page).toBe(2);
  });

  it('should handle multiple page size changes', () => {
    const { result } = renderHook(() =>
      useTablePagination({
        initialPage: 5,
        initialPageSize: 10,
      })
    );

    act(() => {
      result.current.setPageSize(20);
    });

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);

    act(() => {
      result.current.setPageSize(50);
    });

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(50);
  });

  it('should maintain state across re-renders', () => {
    const { result, rerender } = renderHook(() =>
      useTablePagination({
        initialPage: 1,
        initialPageSize: 10,
      })
    );

    act(() => {
      result.current.setPage(3);
      result.current.setPageSize(25);
    });

    expect(result.current.page).toBe(1); // Reset by setPageSize
    expect(result.current.pageSize).toBe(25);

    // Re-render
    rerender();

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(25);
  });

  it('should handle edge cases', () => {
    const { result } = renderHook(() =>
      useTablePagination({
        initialPage: 1,
        initialPageSize: 10,
      })
    );

    // Set page to 0 (should work)
    act(() => {
      result.current.setPage(0);
    });

    expect(result.current.page).toBe(0);

    // Set page size to 0 (should work)
    act(() => {
      result.current.setPageSize(0);
    });

    expect(result.current.page).toBe(1); // Reset by setPageSize
    expect(result.current.pageSize).toBe(0);
  });
});
