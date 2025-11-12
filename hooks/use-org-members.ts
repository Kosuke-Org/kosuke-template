/**
 * Hook for managing organization members
 * Handles member list, role updates, and member removal
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import { organization } from '@/lib/auth/client';

export function useOrgMembers(organizationId: string | undefined) {
  const { toast } = useToast();
  const router = useRouter();
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
    onSuccess: async (data) => {
      try {
        await utils.organizations.getOrgMembers.invalidate({ organizationId: organizationId! });
        await utils.organizations.getUserOrganizations.invalidate();
        const otherOrgs = await utils.organizations.getUserOrganizations.getData();

        if (otherOrgs?.length) {
          const nextOrg = otherOrgs[0];

          await organization.setActive({
            organizationId: nextOrg.id,
            organizationSlug: nextOrg.slug,
          });
        } else {
          await organization.setActive({ organizationId: null, organizationSlug: undefined });
        }

        toast({
          title: 'Success',
          description: data.message,
        });
        // Navigate to root - middleware will redirect based on new session state
        router.push('/');
      } finally {
        setIsLeavingComplete(true);
      }
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
