'use client';

import { use, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Loader2, Mail, Trash2, User } from 'lucide-react';

import { trpc } from '@/lib/trpc/client';

import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTableSearch } from '@/hooks/use-table-search';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { UserOrganizationsDataTable } from './components/user-organizations-data-table';

function UserDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-32" />
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface UserDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [membershipDeleteDialogOpen, setMembershipDeleteDialogOpen] = useState(false);
  const [membershipToDelete, setMembershipToDelete] = useState<{
    id: string;
    userName: string;
    orgName: string;
  } | null>(null);

  const { data: userData, isLoading } = trpc.admin.users.get.useQuery(
    { id: resolvedParams.id },
    {
      staleTime: 1000 * 60 * 2, // 2 minutes
    }
  );

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

  const { data: membershipsData } = trpc.admin.memberships.list.useQuery(
    {
      userId: resolvedParams.id,
      searchQuery: searchValue.trim() || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    },
    {
      placeholderData: (previousData) => previousData,
      staleTime: 1000 * 60 * 2,
      enabled: !!resolvedParams.id,
    }
  );

  const deleteUser = trpc.admin.users.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
      router.push('/admin/users');
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
      setMembershipDeleteDialogOpen(false);
      setMembershipToDelete(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDelete = async () => {
    await deleteUser.mutateAsync({ id: resolvedParams.id });
    setDeleteDialogOpen(false);
  };

  const handleViewOrganization = (slug: string) => {
    router.push(`/admin/organizations/${slug}`);
  };

  const handleRemoveMembership = (id: string, userName: string, orgName: string) => {
    setMembershipToDelete({ id, userName, orgName });
    setMembershipDeleteDialogOpen(true);
  };

  const handleDeleteMembershipConfirm = async () => {
    if (!membershipToDelete) return;
    await deleteMembership.mutateAsync({ id: membershipToDelete.id });
  };

  if (isLoading) {
    return <UserDetailSkeleton />;
  }

  if (!userData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="mb-1 text-lg font-semibold">User not found</h3>
        <p className="text-muted-foreground text-sm">
          The user you&apos;re looking for doesn&apos;t exist or has been deleted.
        </p>
      </div>
    );
  }

  const { user } = userData;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{user.displayName}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{user.email}</p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
          <Trash2 />
          Delete User
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* User Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  User Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-muted-foreground text-sm font-medium">Email</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Mail className="text-muted-foreground h-4 w-4" />
                    {user.email}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm font-medium">Email Verified</div>
                  <div className="mt-1">
                    {user.emailVerified ? (
                      <Badge variant="default">Verified</Badge>
                    ) : (
                      <Badge variant="secondary">Unverified</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm font-medium">User ID</div>
                  <div className="mt-1 font-mono text-sm">{user.id}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm font-medium">Created</div>
                  <div className="mt-1 text-sm">{new Date(user.createdAt).toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="organizations" className="space-y-6">
          <UserOrganizationsDataTable
            memberships={membershipsData?.memberships ?? []}
            total={membershipsData?.total ?? 0}
            page={membershipsData?.page ?? 1}
            pageSize={membershipsData?.pageSize ?? 20}
            totalPages={membershipsData?.totalPages ?? 0}
            searchQuery={searchValue}
            onSearchChange={handleSearchChange}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            onView={handleViewOrganization}
            onRemove={handleRemoveMembership}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {user.displayName} and all related data. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUser.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteUser.isPending}>
              {deleteUser.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={membershipDeleteDialogOpen} onOpenChange={setMembershipDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Membership?</AlertDialogTitle>
            <AlertDialogDescription>
              {membershipToDelete &&
                `Are you sure you want to remove ${membershipToDelete.userName} from ${membershipToDelete.orgName}? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMembership.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMembershipConfirm}
              disabled={deleteMembership.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMembership.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Remove Membership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
