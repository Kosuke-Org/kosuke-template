'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface FormSubmissionOptions<T> {
  onSubmit: (data: T) => Promise<void>;
  onSuccess?: (data: T) => void;
  onError?: (error: Error, data: T) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useFormSubmission<T = unknown>(options: FormSubmissionOptions<T>) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleSubmit = async (data: T) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await options.onSubmit(data);

      if (options.successMessage) {
        toast({
          title: 'Success',
          description: options.successMessage,
        });
      }

      options.onSuccess?.(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An error occurred');
      setError(error);

      console.error('Form submission error:', error);

      const errorMessage =
        options.errorMessage || error.message || 'Failed to submit form. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      options.onError?.(error, data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setError(null);
    setIsSubmitting(false);
  };

  return {
    handleSubmit,
    isSubmitting,
    error,
    reset,
  };
}
