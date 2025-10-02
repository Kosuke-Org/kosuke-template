/**
 * Create Organization Hook
 * Hook for creating organizations with toast and navigation handling
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';

interface CreateOrganizationOptions {
  onSuccess?: (slug: string) => void;
  onError?: (error: unknown) => void;
  redirectAfterCreate?: boolean;
}

export function useCreateOrganization() {
  const router = useRouter();
  const { toast } = useToast();
  const { createOrganizationAsync } = useOrganizations();
  const [isCreating, setIsCreating] = useState(false);

  const createOrganization = async (
    data: { name: string },
    options?: CreateOrganizationOptions
  ) => {
    setIsCreating(true);

    try {
      const result = await createOrganizationAsync({
        name: data.name,
      });

      toast({
        title: 'Success!',
        description: 'Your workspace has been created.',
      });

      // Organization is now immediately synced to local database
      // No need to wait for webhook
      if (options?.redirectAfterCreate !== false) {
        router.push(`/org/${result.slug}/dashboard`);
      }

      options?.onSuccess?.(result.slug);
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating organization:', error);
      toast({
        title: 'Error',
        description: 'Failed to create workspace. Please try again.',
        variant: 'destructive',
      });
      setIsCreating(false);
      options?.onError?.(error);
    }
  };

  return {
    createOrganization,
    isCreating,
  };
}
