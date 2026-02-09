/**
 * useWaitlist Hook
 * Custom hook for waitlist subscription with toast notifications
 */
'use client';

import { useEffect } from 'react';

import { trpc } from '@/lib/trpc/client';

import { useToast } from './use-toast';

export function useWaitlist() {
  const { toast } = useToast();

  const joinMutation = trpc.waitlist.join.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Success!',
        description: data.isNewSubscriber
          ? 'Welcome to the waitlist! Check your email for confirmation.'
          : 'You are already on the waitlist!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to join waitlist. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Auto-reset success state after 5 seconds
  useEffect(() => {
    if (joinMutation.isSuccess) {
      const timer = setTimeout(() => {
        joinMutation.reset();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [joinMutation]);

  return {
    joinWaitlist: joinMutation.mutate,
    isLoading: joinMutation.isPending,
    isSuccess: joinMutation.isSuccess,
    error: joinMutation.error,
  };
}
