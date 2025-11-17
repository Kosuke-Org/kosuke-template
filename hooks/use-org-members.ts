/**
 * Hook for managing organization members
 * Handles member list, role updates, and member removal
 */

'use client';

import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { AUTH_ROUTES } from '@/lib/auth/constants';

export function useOrgMembers(organizationId: string | undefined) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [isLeavingComplete, setIsLeavingComplete] = useState(true);

  // Fetch organization members
  const { data, isLoading, error } = trpc.organizations.getOrgMembers.useQuery(
    { organizationId: organizationId! },
    {
      enabled: !!organizationId,
      staleTime: 1000 * 60 * 2, // 2 minutes
    }
  );

  // Remove member mutation
  const removeMember = trpc.organizations.removeMember.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: data.message,
      });
      utils.organizations.getOrgMembers.invalidate({ organizationId: organizationId! });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update member role mutation
  const updateMemberRole = trpc.organizations.updateMemberRole.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: data.message,
      });
      utils.organizations.getOrgMembers.invalidate({ organizationId: organizationId! });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Leave organization mutation
  const leaveOrganization = trpc.organizations.leaveOrganization.useMutation({
    onMutate: () => {
      setIsLeavingComplete(false);
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: data.message,
      });

      setTimeout(() => {
        setIsLeavingComplete(true);
        // middleware will handle the redirects
        window.location.href = AUTH_ROUTES.ROOT;
      }, 500);
    },
    onError: (error) => {
      setIsLeavingComplete(true);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    members: data?.members ?? [],
    isLoading,
    error,
    removeMember: removeMember.mutate,
    isRemoving: removeMember.isPending,
    updateMemberRole: updateMemberRole.mutate,
    isUpdatingRole: updateMemberRole.isPending,
    leaveOrganization: leaveOrganization.mutate,
    isLeaving: leaveOrganization.isPending || !isLeavingComplete,
  };
}
