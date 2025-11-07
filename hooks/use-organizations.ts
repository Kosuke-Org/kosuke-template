/**
 * Hook for managing user's organizations
 * Fetches and manages the list of organizations the user belongs to
 * Uses Better Auth's organization plugin
 */

'use client';

import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc/client';

export function useOrganizations() {
  const { isSignedIn } = useAuth();

  const {
    data: organizations,
    isLoading,
    error,
    refetch,
  } = trpc.organizations.getUserOrganizations.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
    enabled: isSignedIn,
  });

  return {
    organizations: organizations ?? [],
    isLoading,
    error,
    refetch,
  };
}
