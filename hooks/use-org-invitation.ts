/**
 * Hook for inviting members to organizations
 * Handles member invitation logic
 */

'use client';

import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';

export function useOrgInvitation(organizationId: string | undefined) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Invite member mutation
  const inviteMember = trpc.organizations.inviteMember.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: data.message,
      });
      // Optionally refresh members list
      if (organizationId) {
        utils.organizations.getOrgMembers.invalidate({ organizationId });
      }
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
  };
}
