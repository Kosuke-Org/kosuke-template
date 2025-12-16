'use client';

import { useEffect, useRef } from 'react';

import type { inferRouterInputs } from '@trpc/server';

import { trpc } from '@/lib/trpc/client';
import type { AppRouter } from '@/lib/trpc/router';

import { useToast } from '@/hooks/use-toast';

type RouterInput = inferRouterInputs<AppRouter>;

type DocumentsListQueryParams = RouterInput['documents']['list'];

const DOCUMENT_STATUS_POLL_INTERVAL = 3000;

export function useDocuments(options: DocumentsListQueryParams) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const trackedDocumentsRef = useRef<Set<string>>(new Set());

  const { data, isLoading, error, refetch } = trpc.documents.list.useQuery(
    {
      organizationId: options.organizationId,
      searchQuery: options.searchQuery,
      page: options.page,
      pageSize: options.pageSize,
    },
    {
      staleTime: 1000 * 60 * 2, // 2 minutes
      enabled: !!options.organizationId,
      placeholderData: (previousData) => previousData,
      refetchInterval: (query) => {
        const documents = query.state.data?.documents || [];
        const hasInProgress = documents.some((doc) => doc.status === 'in_progress');
        return hasInProgress ? DOCUMENT_STATUS_POLL_INTERVAL : false;
      },
    }
  );

  // Track in-progress documents and show toasts on status change
  useEffect(() => {
    if (!data?.documents) return;

    data.documents.forEach(({ status, id, displayName }) => {
      if (status === 'in_progress') {
        trackedDocumentsRef.current.add(id);
      }

      if (!trackedDocumentsRef.current.has(id)) return;

      if (status === 'ready') {
        toast({
          title: 'Success',
          description: `"${displayName}" indexed successfully and ready to use`,
        });
        trackedDocumentsRef.current.delete(id);
      }

      if (status === 'error') {
        toast({
          title: 'Indexing Failed',
          description: `"${displayName}" indexing failed.`,
          variant: 'destructive',
        });
        trackedDocumentsRef.current.delete(id);
      }
    });
  }, [data?.documents, toast]);

  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: (newDocument) => {
      toast({
        title: 'Uploading',
        description: 'Document uploaded to storage, indexing in progress...',
      });
      utils.documents.list.invalidate();

      if (newDocument.status === 'in_progress') {
        trackedDocumentsRef.current.add(newDocument.id);
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });
      utils.documents.list.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const uploadDocument = async (params: { file: File; displayName: string; fileData: string }) => {
    const { file, displayName, fileData } = params;

    await uploadMutation.mutateAsync({
      organizationId: options.organizationId,
      displayName,
      mimeType: file.type,
      sizeBytes: file.size.toString(),
      fileData,
    });
  };

  return {
    documents: data?.documents ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pageSize: data?.pageSize ?? 20,
    totalPages: data?.totalPages ?? 0,
    isLoading,
    error,
    refetch,
    uploadDocument,
    deleteDocument: deleteMutation.mutate,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
