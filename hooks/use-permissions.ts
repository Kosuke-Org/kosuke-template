'use client';

import { trpc } from '@/lib/trpc/client';

import { useAuth } from './use-auth';

export function usePermissions() {
  const { isSignedIn } = useAuth();

  const { data: isSuperAdmin, isLoading } = trpc.user.isSuperAdmin.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
    enabled: isSignedIn,
  });

  return {
    isSuperAdmin: isSuperAdmin ?? false,
    isLoading,
  };
}
