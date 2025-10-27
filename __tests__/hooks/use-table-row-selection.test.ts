/**
 * Tests for useTableRowSelection hook
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useTableRowSelection } from '@/hooks/use-table-row-selection';

describe('useTableRowSelection', () => {
  it('should initialize with empty selection', () => {
    const { result } = renderHook(() => useTableRowSelection());

    expect(result.current.selectedRowIds).toEqual([]);
    expect(result.current.hasSelection).toBe(false);
    expect(result.current.selectionCount).toBe(0);
  });

  it('should select a row', () => {
    const { result } = renderHook(() => useTableRowSelection());

    act(() => {
      result.current.selectRow('order-1');
    });

    expect(result.current.selectedRowIds).toEqual(['order-1']);
    expect(result.current.hasSelection).toBe(true);
    expect(result.current.selectionCount).toBe(1);
  });

  it('should deselect a row', () => {
    const { result } = renderHook(() => useTableRowSelection());

    act(() => {
      result.current.setSelectedRowIds(['order-1', 'order-2', 'order-3']);
    });

    act(() => {
      result.current.deselectRow('order-2');
    });

    expect(result.current.selectedRowIds).toEqual(['order-1', 'order-3']);
    expect(result.current.selectionCount).toBe(2);
  });

  it('should toggle a row selection', () => {
    const { result } = renderHook(() => useTableRowSelection());

    // Toggle on
    act(() => {
      result.current.toggleRow('order-1');
    });

    expect(result.current.selectedRowIds).toEqual(['order-1']);

    // Toggle off
    act(() => {
      result.current.toggleRow('order-1');
    });

    expect(result.current.selectedRowIds).toEqual([]);
  });

  it('should clear all selections', () => {
    const { result } = renderHook(() => useTableRowSelection());

    act(() => {
      result.current.setSelectedRowIds(['order-1', 'order-2', 'order-3']);
    });

    expect(result.current.selectionCount).toBe(3);

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedRowIds).toEqual([]);
    expect(result.current.hasSelection).toBe(false);
    expect(result.current.selectionCount).toBe(0);
  });

  it('should handle multiple selections', () => {
    const { result } = renderHook(() => useTableRowSelection());

    act(() => {
      result.current.selectRow('order-1');
      result.current.selectRow('order-2');
      result.current.selectRow('order-3');
    });

    expect(result.current.selectedRowIds).toEqual(['order-1', 'order-2', 'order-3']);
    expect(result.current.selectionCount).toBe(3);
  });

  it('should set selected row ids directly', () => {
    const { result } = renderHook(() => useTableRowSelection());

    act(() => {
      result.current.setSelectedRowIds(['order-5', 'order-10', 'order-15']);
    });

    expect(result.current.selectedRowIds).toEqual(['order-5', 'order-10', 'order-15']);
    expect(result.current.hasSelection).toBe(true);
    expect(result.current.selectionCount).toBe(3);
  });
});
