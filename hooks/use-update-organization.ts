/**
 * Update Organization Hook
 * Hook for updating organization details with mutation handling
 */

'use client';

import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';

interface UpdateOrganizationOptions {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export function useUpdateOrganization(organizationId: string) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const updateMutation = trpc.organizations.updateOrganization.useMutation({
    onMutate: (input) => {
      // Optimistically update organization name and logo
      const previousData = utils.organizations.getUserOrganizations.getData();

      utils.organizations.getUserOrganizations.setData(undefined, (old) => {
        if (!old) return old;
        return old.map((org) => {
          if (org.id !== organizationId) return org;
          return {
            ...org,
            name: input?.name ?? org.name,
            logoUrl: input?.logoUrl !== undefined ? input.logoUrl : org.logoUrl,
          };
        });
      });

      return { previousData };
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Organization updated successfully',
      });
    },
    onError: (error, _input, context) => {
      // Rollback optimistic updates
      if (context?.previousData !== undefined) {
        utils.organizations.getUserOrganizations.setData(undefined, context.previousData);
      }

      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateOrganization = (
    data: { name?: string; logoUrl?: string | null; settings?: Record<string, unknown> },
    options?: UpdateOrganizationOptions
  ) => {
    updateMutation.mutate(
      {
        organizationId,
        ...data,
      },
      {
        onSuccess: () => {
          options?.onSuccess?.();
        },
        onError: (error) => {
          options?.onError?.(error);
        },
      }
    );
  };

  return {
    updateOrganization,
    isUpdating: updateMutation.isPending,
  };
}
