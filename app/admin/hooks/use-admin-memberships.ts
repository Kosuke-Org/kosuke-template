'use client';

import { trpc } from '@/lib/trpc/client';

import { useToast } from '@/hooks/use-toast';

export function useAdminMemberships() {
  const { toast } = useToast();

  const createMembership = trpc.admin.memberships.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User added to organization successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMembership = trpc.admin.memberships.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Member role updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMembership = trpc.admin.memberships.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Membership removed successfully',
      });
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
    createMembership: createMembership.mutate,
    updateMembership: updateMembership.mutate,
    deleteMembership: deleteMembership.mutate,
    isCreating: createMembership.isPending,
    isUpdating: updateMembership.isPending,
    isDeleting: deleteMembership.isPending,
  };
}
