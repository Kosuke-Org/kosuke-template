/**
 * Hook for managing user's organizations
 * Fetches and manages the list of organizations the user belongs to
 */

'use client';

import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import type { AppRouter } from '@/lib/trpc/router';
import type { inferRouterOutputs } from '@trpc/server';

type RouterOutput = inferRouterOutputs<AppRouter>;
type Organization = RouterOutput['organizations']['getUserOrganizations'][number];

export function useOrganizations() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Fetch user's organizations
  const {
    data: organizations,
    isLoading,
    error,
    refetch,
  } = trpc.organizations.getUserOrganizations.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  // Create organization mutation
  const createOrganization = trpc.organizations.createOrganization.useMutation({
    onSuccess: async () => {
      // Refetch organizations list immediately to ensure new org appears in the sidebar
      // Use refetch() instead of invalidate() to wait for completion
      await utils.organizations.getUserOrganizations.refetch();
    },
  });

  return {
    organizations: organizations ?? [],
    isLoading,
    error,
    refetch,
    createOrganization: createOrganization.mutate,
    createOrganizationAsync: createOrganization.mutateAsync,
    isCreating: createOrganization.isPending,
  };
}

export type { Organization };
