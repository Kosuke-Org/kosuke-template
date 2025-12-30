'use client';

import * as React from 'react';

import { Loader2 } from 'lucide-react';

import { trpc } from '@/lib/trpc/client';

import { useAdminFileSearchStores } from '@/hooks/use-admin-rag';
import { useToast } from '@/hooks/use-toast';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { StoresDataTable } from './components/stores-data-table';

export default function AdminRagPage() {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [storeToDelete, setStoreToDelete] = React.useState<{
    name: string;
    displayName: string;
  } | null>(null);

  // File Search Stores state
  const {
    data: storesData,
    isLoading: storesLoading,
    refetch: refetchStores,
  } = useAdminFileSearchStores();

  // Mutations
  const deleteStore = trpc.admin.rag.deleteStore.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'File Search Store deleted successfully',
      });
      setDeleteDialogOpen(false);
      setStoreToDelete(null);
      refetchStores();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDeleteClick = (name: string, displayName: string) => {
    setStoreToDelete({ name, displayName });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!storeToDelete) return;
    deleteStore.mutate({ name: storeToDelete.name });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">File Search Stores</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage Google&apos;s File Search Stores.
        </p>
      </div>

      <StoresDataTable
        stores={storesData?.stores ?? []}
        isLoading={storesLoading}
        onDelete={handleDeleteClick}
      />

      {/* Delete Store Dialog */}
      <AlertDialog
        open={deleteDialogOpen || deleteStore.isPending}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File Search Store?</AlertDialogTitle>
            <AlertDialogDescription>
              {storeToDelete &&
                `Are you sure you want to delete "${storeToDelete.displayName}"? This will permanently remove the File Search Store from Google and all associated documents. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStore.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteStore.isPending}>
              {deleteStore.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
