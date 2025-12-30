/**
 * Reusable hook for debounced table search
 * Manages both immediate input value and debounced value internally
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

interface UseTableSearchOptions {
  initialValue?: string;
  debounceMs?: number;
}

export function useTableSearch({ initialValue = '', debounceMs = 500 }: UseTableSearchOptions) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [inputValue, debounceMs]);

  const clearSearch = useCallback(() => {
    setInputValue('');
    setDebouncedValue('');
  }, []);

  return {
    inputValue,
    searchValue: debouncedValue,
    setSearchValue: setInputValue,
    clearSearch,
  };
}
