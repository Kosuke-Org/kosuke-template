'use client';

import { useMutation } from '@tanstack/react-query';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export function useAuthActions() {
  const { signOut } = useClerk();
  const router = useRouter();
  const { toast } = useToast();

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await signOut();
    },
    onSuccess: () => {
      router.replace('/home');
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
