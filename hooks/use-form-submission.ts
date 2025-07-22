'use client';

import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { FormSubmissionOptions } from '@/lib/api';

export function useFormSubmission<T = unknown>(options: FormSubmissionOptions<T>) {
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: options.onSubmit,
    onSuccess: (result, data) => {
      if (options.successMessage) {
        toast({
          title: 'Success',
          description: options.successMessage,
        });
      }
      options.onSuccess?.(data);
    },
    onError: (err, data) => {
      const error = err instanceof Error ? err : new Error('An error occurred');
      console.error('Form submission error:', error);

      const errorMessage =
        options.errorMessage || error.message || 'Failed to submit form. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      options.onError?.(error, data);
    },
  });

  return {
    handleSubmit: mutation.mutate,
    isSubmitting: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
    // Additional TanStack Query utilities
    mutateAsync: mutation.mutateAsync,
  };
}
