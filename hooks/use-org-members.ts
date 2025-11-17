/**
 * Hook for managing organization members
 * Handles member list, role updates, and member removal
 */

'use client';

import { useState } from 'react';

import { AUTH_ROUTES } from '@/lib/auth/constants';
import { trpc } from '@/lib/trpc/client';

import { useToast } from '@/hooks/use-toast';

export function useOrgMembers() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [isLeavingComplete, setIsLeavingComplete] = useState(true);

  // Remove member mutation
  const removeMember = trpc.organizations.removeMember.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: data.message,
      });
      utils.organizations.getOrganization.invalidate();
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
      utils.organizations.getOrganization.invalidate();
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
    removeMember: removeMember.mutate,
    isRemoving: removeMember.isPending,
    updateMemberRole: updateMemberRole.mutate,
    isUpdatingRole: updateMemberRole.isPending,
    leaveOrganization: leaveOrganization.mutate,
    isLeaving: leaveOrganization.isPending || !isLeavingComplete,
  };
}
