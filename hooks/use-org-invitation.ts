/**
 * Hook for inviting members to organizations
 * Handles member invitation logic
 */

'use client';

import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';

export function useOrgInvitation() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const inviteMember = trpc.organizations.inviteMember.useMutation({
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

  const cancelInvitation = trpc.organizations.cancelInvitation.useMutation({
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

  return {
    inviteMember: inviteMember.mutate,
    isInviting: inviteMember.isPending,
    cancelInvitation: cancelInvitation.mutate,
    isCancellingInvitation: cancelInvitation.isPending,
  };
}
