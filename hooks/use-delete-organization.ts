/**
 * Delete Organization Hook
 * Hook for deleting an organization (owner only)
 */

'use client';

import { AUTH_ROUTES } from '@/lib/auth/constants';
import { trpc } from '@/lib/trpc/client';

import { useToast } from '@/hooks/use-toast';

export function useDeleteOrganization() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.organizations.deleteOrganization.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: data.message,
      });

      utils.organizations.getUserOrganizations.invalidate();
      utils.organizations.getOrganization.invalidate();

      // Redirect to root - middleware will handle redirects
      setTimeout(() => {
        window.location.href = AUTH_ROUTES.ROOT;
      }, 500);
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
    deleteOrganization: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
