/**
 * Reusable hook for debounced table search
 * Provides local debounced state that syncs to parent after delay
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseTableSearchOptions {
  initialValue?: string;
  debounceMs?: number;
  onSearchChange: (query: string) => void;
}

export function useTableSearch({
  initialValue = '',
  debounceMs = 500,
  onSearchChange,
}: UseTableSearchOptions) {
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  // Sync debounced value to parent after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(debouncedValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [debouncedValue, debounceMs, onSearchChange]);

  // Clear search
  const clearSearch = useCallback(() => {
    setDebouncedValue('');
  }, []);

  return {
    searchValue: debouncedValue,
    setSearchValue: setDebouncedValue,
    clearSearch,
  };
}
