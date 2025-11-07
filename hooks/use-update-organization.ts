/**
 * Update Organization Hook
 * Hook for updating organization details with mutation handling
 */

'use client';

import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';

export function useUpdateOrganization() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const updateMutation = trpc.organizations.updateOrganization.useMutation({
    onMutate: (input) => {
      const { organizationId } = input;
      const previousData = utils.organizations.getOrganization.getData({ organizationId });

      utils.organizations.getOrganization.setData({ organizationId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          name: input?.name ?? old.name,
        };
      });

      return { previousData };
    },
    onSuccess: (_, variables) => {
      const { organizationId } = variables;
      toast({
        title: 'Success',
        description: 'Organization updated successfully',
      });
      utils.organizations.getOrganization.invalidate({ organizationId });
    },
    onError: (error, input, context) => {
      const { organizationId } = input;

      // Rollback optimistic updates
      if (context?.previousData !== undefined) {
        utils.organizations.getOrganization.setData({ organizationId }, context.previousData);
      }

      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    updateOrganization: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
