/**
 * Organization Documents Page
 * Upload and manage documents for RAG (Retrieval Augmented Generation)
 */

'use client';

import { useState } from 'react';

import { Loader2, Upload } from 'lucide-react';

import { fileToBase64 } from '@/lib/utils';

import { useDocuments } from '@/hooks/use-documents';
import { useGoogleApiKey } from '@/hooks/use-google-api-key';
import { useOrganization } from '@/hooks/use-organization';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTableSearch } from '@/hooks/use-table-search';

import { TableSkeleton } from '@/components/data-table/data-table-skeleton';
import { ErrorMessage } from '@/components/error-message';
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
import { Button } from '@/components/ui/button';

import { DocumentsDataTable } from './components/documents-data-table';
import { UploadDocumentDialog } from './components/upload-document-dialog';

export default function DocumentsPage() {
  const { organization: activeOrganization, isLoading: isLoadingOrg } = useOrganization();
  const { isConfigured: hasApiKey, isLoading: isLoadingApiKey } = useGoogleApiKey();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{
    id: string;
    displayName: string;
  } | null>(null);

  const { inputValue, searchValue, setSearchValue } = useTableSearch({
    initialValue: '',
    debounceMs: 300,
  });

  const { page, pageSize, setPage, setPageSize, goToFirstPage } = useTablePagination({
    initialPage: 1,
    initialPageSize: 20,
  });

  const {
    documents,
    total,
    totalPages,
    isLoading,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    isUploading,
    isDeleting,
  } = useDocuments({
    organizationId: activeOrganization?.id ?? '',
    searchQuery: searchValue.trim() || undefined,
    page,
    pageSize,
  });

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (page !== 1) {
      goToFirstPage();
    }
  };

  const handleUploadDocument = async (file: File, displayName: string) => {
    const fileData = await fileToBase64(file);

    await uploadDocument({ file, displayName, fileData });
  };

  const handleDeleteClick = (id: string, displayName: string) => {
    setDocumentToDelete({ id, displayName });
    setDeleteDialogOpen(true);
  };

  const handleDownload = async (_storageUrl: string, documentId: string) => {
    await downloadDocument(documentId);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;
    deleteDocument(
      {
        id: documentToDelete.id,
        organizationId: activeOrganization?.id ?? '',
      },
      {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setDocumentToDelete(null);
        },
      }
    );
  };

  if (isLoadingOrg || isLoading || !activeOrganization || isLoadingApiKey) {
    return <TableSkeleton />;
  }

  if (!hasApiKey) {
    return (
      <ErrorMessage
        title="Google AI API Key required"
        description="The GOOGLE_AI_API_KEY environment variable is not configured. Please contact your administrator to set this up."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Upload and manage documents for AI-powered chat
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4" />
          Upload Document
        </Button>
      </div>

      <DocumentsDataTable
        isLoading={isLoading}
        documents={documents}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        searchQuery={inputValue}
        onSearchChange={handleSearchChange}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onDelete={handleDeleteClick}
        onDownload={handleDownload}
      />

      <UploadDocumentDialog
        open={uploadDialogOpen || isUploading}
        onOpenChange={setUploadDialogOpen}
        onUpload={handleUploadDocument}
        isUploading={isUploading}
      />

      <AlertDialog open={deleteDialogOpen || isDeleting} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {documentToDelete &&
                `Are you sure you want to delete "${documentToDelete.displayName}"? Your assistant will no longer have access to this document. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
