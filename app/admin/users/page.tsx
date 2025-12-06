'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Loader2 } from 'lucide-react';
import type { z } from 'zod';

import { trpc } from '@/lib/trpc/client';
import type { adminCreateUserSchema } from '@/lib/trpc/schemas/admin';

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

import { CreateUserDialog } from './components/create-user-dialog';
import { UsersDataTable } from './components/users-data-table';

export default function AdminUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{
    id: string;
    email: string;
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

  const { data, isLoading, refetch } = trpc.admin.users.list.useQuery(
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

  const { data: orgsData } = trpc.admin.organizations.list.useQuery(
    {
      page: 1,
      pageSize: 100,
    },
    {
      staleTime: 1000 * 60 * 5,
    }
  );

  const createUser = trpc.admin.users.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User created successfully',
      });
      setCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteUser = trpc.admin.users.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
      refetch();
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleViewClick = (id: string) => {
    router.push(`/admin/users/${id}`);
  };

  const handleDeleteClick = (id: string, email: string) => {
    setUserToDelete({ id, email });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!userToDelete) return;
    deleteUser.mutate({ id: userToDelete.id });
  };

  const handleCreateSubmit = (data: z.infer<typeof adminCreateUserSchema>) => {
    createUser.mutate(data);
  };

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage all users in the system</p>
      </div>

      <UsersDataTable
        users={data?.users ?? []}
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
        onCreate={() => setCreateDialogOpen(true)}
      />

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateSubmit}
        isPending={createUser.isPending}
        availableOrganizations={orgsData?.organizations ?? []}
      />

      <AlertDialog
        open={deleteDialogOpen || deleteUser.isPending}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {userToDelete &&
                `Are you sure you want to delete "${userToDelete.email}"? This action cannot be undone and will cascade delete all related data.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUser.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteUser.isPending}>
              {deleteUser.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
