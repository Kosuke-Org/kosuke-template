'use client';

import { useMutation } from '@tanstack/react-query';
import { useClerk } from '@clerk/nextjs';
import { useToast } from '@/hooks/use-toast';

export function useAuthActions() {
  const { signOut } = useClerk();
  const { toast } = useToast();

  const signOutMutation = useMutation({
    mutationFn: () => {
      // Sign out and redirect to home page
      // Clerk automatically clears entire session including orgSlug
      return signOut({ redirectUrl: '/' });
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
