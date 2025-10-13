/**
 * Create Organization Hook
 * Hook for creating organizations with toast and navigation handling
 */

'use client';

import { useOrganizationList } from '@clerk/nextjs';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc/client';

interface CreateOrganizationOptions {
  onSuccess?: (slug: string) => void;
  onError?: (error: unknown) => void;
  redirectAfterCreate?: boolean;
}

export function useCreateOrganization() {
  const { toast } = useToast();
  const { setActive } = useOrganizationList();
  const utils = trpc.useUtils();

  const mutation = trpc.organizations.createOrganization.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Success!',
        description: 'Your workspace has been created.',
      });
      setActive?.({ organization: data.slug });
      utils.organizations.getUserOrganizations.refetch();
    },
    onError: (error) => {
      console.error('Failed to create workspace', error);
      toast({
        title: 'Error',
        description: 'Failed to create workspace. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleCreateOrganization = (
    data: { name: string },
    options?: CreateOrganizationOptions
  ) => {
    mutation.mutate(data, {
      onSuccess: (result) => options?.onSuccess?.(result.slug),
      onError: (error) => options?.onError?.(error),
    });
  };

  return {
    createOrganization: handleCreateOrganization,
    isCreating: mutation.isPending,
  };
}
