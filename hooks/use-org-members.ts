/**
 * Hook for managing organization members
 * Handles member list, role updates, and member removal
 */

'use client';

import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';

export function useOrgMembers(organizationId: string | undefined) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

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

  return {
    members: data?.members ?? [],
    isLoading,
    error,
    removeMember: removeMember.mutate,
    isRemoving: removeMember.isPending,
    updateMemberRole: updateMemberRole.mutate,
    isUpdatingRole: updateMemberRole.isPending,
  };
}
