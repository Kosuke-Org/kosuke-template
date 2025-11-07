'use client';

import { trpc } from '@/lib/trpc/client';
import { useAuth } from './use-auth';

/**
 * Hook to fetch full user data from database
 * Uses tRPC to query user by ID from session
 */
export function useUser() {
  const { isSignedIn } = useAuth();

  const { data: user, isLoading } = trpc.user.getUser.useQuery(undefined, {
    enabled: isSignedIn,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    user,
    isLoading,
  };
}
