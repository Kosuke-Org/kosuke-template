'use client';

import * as React from 'react';

import { Loader2 } from 'lucide-react';

import {
  useAdminFileSearchStores,
  useDeleteAllDocuments,
  useDeleteDanglingDocuments,
  useDeleteStore,
} from '@/hooks/use-admin-rag';

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

type DialogType = 'deleteStore' | 'deleteAllDocuments' | 'deleteDanglingDocuments';

export default function AdminRagPage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [dialogType, setDialogType] = React.useState<DialogType | null>(null);
  const [storeToAction, setStoreToAction] = React.useState<{
    name: string;
    displayName: string;
  } | null>(null);

  // File Search Stores state
  const { data: storesData, isLoading: storesLoading } = useAdminFileSearchStores();

  const closeDialog = () => {
    setDeleteDialogOpen(false);
    setDialogType(null);
    setStoreToAction(null);
  };

  // Mutations
  const deleteStore = useDeleteStore({ onSettled: closeDialog });
  const deleteAllDocuments = useDeleteAllDocuments({ onSettled: closeDialog });
  const deleteDanglingDocuments = useDeleteDanglingDocuments({ onSettled: closeDialog });

  const handleDeleteStoreClick = (name: string, displayName: string) => {
    setStoreToAction({ name, displayName });
    setDialogType('deleteStore');
    setDeleteDialogOpen(true);
  };

  const handleDeleteAllDocumentsClick = (name: string, displayName: string) => {
    setStoreToAction({ name, displayName });
    setDialogType('deleteAllDocuments');
    setDeleteDialogOpen(true);
  };

  const handleDeleteDanglingDocumentsClick = (name: string, displayName: string) => {
    setStoreToAction({ name, displayName });
    setDialogType('deleteDanglingDocuments');
    setDeleteDialogOpen(true);
  };

  const handleConfirm = () => {
    if (!storeToAction) return;

    switch (dialogType) {
      case 'deleteStore':
        deleteStore.mutate({ storeName: storeToAction.name });
        break;
      case 'deleteAllDocuments':
        deleteAllDocuments.mutate({ storeName: storeToAction.name });
        break;
      case 'deleteDanglingDocuments':
        deleteDanglingDocuments.mutate({ storeName: storeToAction.name });
        break;
    }
  };

  const isLoading =
    deleteStore.isPending || deleteAllDocuments.isPending || deleteDanglingDocuments.isPending;

  const getDialogContent = () => {
    if (!storeToAction) return null;

    switch (dialogType) {
      case 'deleteStore':
        return {
          title: 'Delete File Search Store?',
          description: `Are you sure you want to delete "${storeToAction.displayName}"? This will permanently remove the File Search Store. This action cannot be undone.`,
          action: 'Delete Store',
        };
      case 'deleteAllDocuments':
        return {
          title: 'Delete All Documents?',
          description: `Are you sure you want to delete all documents from "${storeToAction.displayName}"? This will permanently remove all documents from the File Search Store. This action cannot be undone.`,
          action: 'Delete All Documents',
        };
      case 'deleteDanglingDocuments':
        return {
          title: 'Delete Dangling Documents?',
          description: `Are you sure you want to delete dangling documents from "${storeToAction.displayName}"? This will permanently remove documents that exist in the File Search Store but not in the database. This action cannot be undone.`,
          action: 'Delete Dangling Documents',
        };
      default:
        return null;
    }
  };

  const dialogContent = getDialogContent();

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
        onDeleteStore={handleDeleteStoreClick}
        onDeleteAllDocuments={handleDeleteAllDocumentsClick}
        onDeleteDanglingDocuments={handleDeleteDanglingDocumentsClick}
      />

      <AlertDialog open={deleteDialogOpen || isLoading} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent?.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogContent?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {dialogContent?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
