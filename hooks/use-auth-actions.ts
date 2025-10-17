'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useClerk } from '@clerk/nextjs';
import { useToast } from '@/hooks/use-toast';

export function useAuthActions() {
  const { signOut } = useClerk();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await signOut({ redirectUrl: '/' });
      // Clear all cached queries first to prevent stale data or data from other users
      queryClient.clear();
    },
    onError: (error) => {
      console.error('Error signing out:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    handleSignOut: signOutMutation.mutate,
    isSigningOut: signOutMutation.isPending,
    signOutError: signOutMutation.error,
  };
}
