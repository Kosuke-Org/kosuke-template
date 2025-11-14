/**
 * Hook for managing user's organizations
 * Fetches and manages the list of organizations the user belongs to
 * Uses Better Auth's organization plugin
 */

'use client';

import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc/client';

export function useOrganization() {
  const { isSignedIn, activeOrganizationId, user: currentUser } = useAuth();

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

  const pendingInvitations =
    organization?.invitations.filter((invitation) => invitation.status === 'pending') ?? [];

  const members = organization?.members ?? [];
  const currentUserRole = members.find((m) => m.userId === currentUser?.id)?.role;

  return {
    organization: organization ?? null,
    invitations: pendingInvitations,
    members,
    currentUserRole,
    isLoading,
    error,
    refetch,
  };
}
