/**
 * Hook for managing the active organization
 * Uses Better Auth session's activeOrganizationSlug as source of truth
 */

'use client';

// import { authClient } from '@/lib/auth/client';

// // TODO investigate 401 when logged out - shouldn't be called when logged out
// export function useActiveOrganization() {
//   const { data: activeOrganization } = authClient.useActiveOrganization();

//   return {
//     activeOrganization,
//     isLoading: !activeOrganization,
//   };
// }

import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc/client';

export function useActiveOrganization() {
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
    activeOrganization: organization ?? null,
    isLoading,
    error,
    refetch,
  };
}
