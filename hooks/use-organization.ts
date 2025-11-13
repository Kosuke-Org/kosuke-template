/**
 * Hook for managing user's organizations
 * Fetches and manages the list of organizations the user belongs to
 * Uses Better Auth's organization plugin
 */

'use client';

import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc/client';

export function useOrganization() {
  const { isSignedIn, activeOrganizationId } = useAuth();

  const {
    data: organization,
    isLoading,
    error,
    refetch,
  } = trpc.organizations.getOrganization.useQuery(
    { organizationId: activeOrganizationId! },
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      enabled: isSignedIn && !!activeOrganizationId,
    }
  );

  return {
    organization: organization ?? null,
    isLoading,
    error,
    refetch,
  };
}
