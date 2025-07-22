'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { AsyncOperationOptions } from '@/lib/api';

export function useAsyncOperation<T extends unknown[] = [], R = void>(
  operation: (...args: T) => Promise<R>,
  options: AsyncOperationOptions = {}
) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<R | null>(null);

  const execute = useCallback(
    async (...args: T): Promise<R | null> => {
      if (isLoading) return null;

      setIsLoading(true);
      setError(null);

      try {
        const result = await operation(...args);
        setData(result);

        if (options.successMessage) {
          toast({
            title: 'Success',
            description: options.successMessage,
          });
        }

        options.onSuccess?.();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An error occurred');
        setError(error);

        console.error('Async operation error:', error);

        const errorMessage =
          options.errorMessage || error.message || 'Operation failed. Please try again.';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });

        options.onError?.(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [operation, options, toast, isLoading]
  );

  const reset = useCallback(() => {
    setError(null);
    setData(null);
    setIsLoading(false);
  }, []);

  return {
    execute,
    isLoading,
    error,
    data,
    reset,
  };
}
