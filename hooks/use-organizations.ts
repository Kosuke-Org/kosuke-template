/**
 * Hook for managing user's organizations
 * Fetches and manages the list of organizations the user belongs to
 */

'use client';

import { useAuth } from '@clerk/nextjs';
import { trpc } from '@/lib/trpc/client';
import type { AppRouter } from '@/lib/trpc/router';
import type { inferRouterOutputs } from '@trpc/server';

type RouterOutput = inferRouterOutputs<AppRouter>;
type Organization = RouterOutput['organizations']['getUserOrganizations'][number];

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
    enabled: !!isSignedIn,
  });

  return {
    organizations: organizations ?? [],
    isLoading,
    error,
    refetch,
  };
}

export type { Organization };
