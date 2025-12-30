'use client';

import { trpc } from '@/lib/trpc/client';

import { useToast } from '@/hooks/use-toast';

export function useAdminFileSearchStores() {
  return trpc.admin.rag.listStores.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useDeleteStore({ onSettled }: { onSettled: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  return trpc.admin.rag.deleteStore.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'File Search Store deleted successfully',
      });
      utils.admin.rag.listStores.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled,
  });
}

export function useDeleteAllDocuments({ onSettled }: { onSettled: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  return trpc.admin.rag.deleteAllDocuments.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: data?.message || 'All documents deleted successfully',
      });
      utils.admin.rag.listStores.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled,
  });
}

export function useDeleteDanglingDocuments({ onSettled }: { onSettled: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  return trpc.admin.rag.deleteDanglingDocuments.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: data?.message || 'Dangling documents deleted successfully',
      });
      utils.admin.rag.listStores.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled,
  });
}
