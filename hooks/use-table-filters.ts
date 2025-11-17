/**
 * Reusable hook for table filtering
 * Generic hook that can manage any filter state with reset functionality
 */

'use client';

import { useCallback, useState } from 'react';

export function useTableFilters<T extends Record<string, unknown>>(initialFilters: T) {
  const [filters, setFilters] = useState<T>(initialFilters);

  const updateFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateFilters = useCallback((updates: Partial<T>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const clearFilter = useCallback(
    <K extends keyof T>(key: K) => {
      setFilters((prev) => ({ ...prev, [key]: initialFilters[key] }));
    },
    [initialFilters]
  );

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    clearFilter,
  };
}
