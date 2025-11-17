/**
 * Hook for managing user's organizations
 * Fetches and manages the list of organizations the user belongs to
 * Uses Better Auth's organization plugin
 */

'use client';

import { trpc } from '@/lib/trpc/client';

import { useAuth } from '@/hooks/use-auth';

export function useOrganizations() {
  const { isSignedIn, userId } = useAuth();

  const {
    data: organizations,
    isLoading,
    error,
    refetch,
  } = trpc.organizations.getUserOrganizations.useQuery(
    { userId: userId! },
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      enabled: isSignedIn && !!userId,
    }
  );

  return {
    organizations: organizations ?? [],
    isLoading,
    error,
    refetch,
  };
}
