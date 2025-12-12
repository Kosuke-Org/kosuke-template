'use client';

import { trpc } from '@/lib/trpc/client';

import { useToast } from '@/hooks/use-toast';

interface UseDocumentsOptions {
  organizationId: string;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
}

export function useDocuments(options: UseDocumentsOptions) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data, isLoading, error, refetch } = trpc.documents.list.useQuery(
    {
      organizationId: options.organizationId,
      searchQuery: options.searchQuery,
      page: options.page ?? 1,
      pageSize: options.pageSize ?? 20,
    },
    {
      staleTime: 1000 * 60 * 2, // 2 minutes
      enabled: !!options.organizationId,
      placeholderData: (previousData) => previousData,
    }
  );

  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
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

  const uploadDocument = async (params: {
    file: File;
    displayName: string;
    fileBase64: string;
  }) => {
    await uploadMutation.mutateAsync({
      organizationId: options.organizationId,
      displayName: params.displayName,
      mimeType: params.file.type,
      sizeBytes: params.file.size.toString(),
      fileBase64: params.fileBase64,
    });
  };

  const deleteDocument = async (documentId: string) => {
    await deleteMutation.mutateAsync({
      id: documentId,
      organizationId: options.organizationId,
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
    deleteDocument,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
