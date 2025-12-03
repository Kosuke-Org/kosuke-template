'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Loader2 } from 'lucide-react';

import { trpc } from '@/lib/trpc/client';

import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTableSearch } from '@/hooks/use-table-search';
import { useToast } from '@/hooks/use-toast';

import { TableSkeleton } from '@/components/data-table/data-table-skeleton';
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

import { OrganizationsDataTable } from './components/organizations-data-table';

export default function AdminOrganizationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const pagination = useTablePagination({ initialPage: 1, initialPageSize: 20 });

  const { searchValue, setSearchValue } = useTableSearch({
    initialValue: '',
    debounceMs: 500,
    onSearchChange: () => {
      // Actual search happens via searchValue in query
    },
  });

  // Reset to first page when search value changes
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (pagination.page !== 1) {
      pagination.goToFirstPage();
    }
  };

  const { data, isLoading, refetch } = trpc.admin.organizations.list.useQuery(
    {
      searchQuery: searchValue.trim() || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    },
    {
      placeholderData: (previousData) => previousData,
      staleTime: 1000 * 60 * 2,
    }
  );

  const deleteOrg = trpc.admin.organizations.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Organization deleted successfully',
      });
      refetch();
      setDeleteDialogOpen(false);
      setOrgToDelete(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleViewClick = (slug: string) => {
    router.push(`/admin/organizations/${slug}`);
  };

  const handleDeleteClick = (id: string, name: string) => {
    setOrgToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!orgToDelete) return;
    await deleteOrg.mutateAsync({ id: orgToDelete.id });
  };

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organizations</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage all organizations in the system</p>
      </div>

      <OrganizationsDataTable
        organizations={data?.organizations ?? []}
        total={data?.total ?? 0}
        page={data?.page ?? 1}
        pageSize={data?.pageSize ?? 20}
        totalPages={data?.totalPages ?? 0}
        searchQuery={searchValue}
        onSearchChange={handleSearchChange}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
        onView={handleViewClick}
        onDelete={handleDeleteClick}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {orgToDelete &&
                `Are you sure you want to delete "${orgToDelete.name}"? This action cannot be undone and will cascade delete all memberships, tasks, and orders.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteOrg.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteOrg.isPending}>
              {deleteOrg.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
