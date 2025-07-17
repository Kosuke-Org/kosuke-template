'use client';

import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useAuthActions() {
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [signOut, router]);

  return {
    handleSignOut,
  };
}
