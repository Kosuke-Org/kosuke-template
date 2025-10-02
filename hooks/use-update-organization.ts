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
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Organization updated successfully',
      });
      utils.organizations.getUserOrganizations.invalidate();
      utils.organizations.getOrganization.invalidate({ organizationId });
    },
    onError: (error) => {
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
