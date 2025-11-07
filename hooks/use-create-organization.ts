/**
 * Create Organization Hook
 * Hook for creating organizations with toast and navigation handling
 */

'use client';

import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc/client';

interface CreateOrganizationOptions {
  onSuccess?: (slug: string) => void;
  onError?: (error: unknown) => void;
  redirectAfterCreate?: boolean;
}

export function useCreateOrganization() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const mutation = trpc.organizations.createOrganization.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success!',
        description: 'Your workspace has been created.',
      });
      utils.organizations.getUserOrganizations.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreateOrganization = (
    data: { name: string },
    options?: CreateOrganizationOptions
  ) => {
    mutation.mutate(data, {
      onSuccess: (result) => {
        if (result?.slug) {
          options?.onSuccess?.(result.slug);
        }
      },
      onError: (error) => options?.onError?.(error),
    });
  };

  return {
    createOrganization: handleCreateOrganization,
    isCreating: mutation.isPending,
  };
}
