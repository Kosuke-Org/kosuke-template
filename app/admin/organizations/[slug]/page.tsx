'use client';

import { use, useState } from 'react';

import { useRouter } from 'next/navigation';

import { format } from 'date-fns';
import { Building2, Loader2, Trash } from 'lucide-react';

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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { OrgMembersDataTable } from './components/org-members-data-table';

function OrgDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-32" />
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

interface OrgDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function OrgDetailPage({ params }: OrgDetailPageProps) {
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

  const { data: orgData, isLoading } = trpc.admin.organizations.get.useQuery(
    { slug: resolvedParams.slug },
    {
      staleTime: 1000 * 60 * 2,
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
      organizationId: orgData?.organization.id,
      searchQuery: searchValue.trim() || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    },
    {
      placeholderData: (previousData) => previousData,
      staleTime: 1000 * 60 * 2,
      enabled: !!orgData?.organization.id,
    }
  );

  const deleteOrg = trpc.admin.organizations.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Organization deleted successfully',
      });
      router.push('/admin/organizations');
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
    await deleteOrg.mutateAsync({ id: orgData?.organization.id ?? '' });
    setDeleteDialogOpen(false);
  };

  const handleViewUser = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  const handleRemoveMember = (id: string, userName: string, orgName: string) => {
    setMembershipToDelete({ id, userName, orgName });
    setMembershipDeleteDialogOpen(true);
  };

  const handleDeleteMembershipConfirm = async () => {
    if (!membershipToDelete) return;
    await deleteMembership.mutateAsync({ id: membershipToDelete.id });
  };

  if (isLoading) {
    return <OrgDetailSkeleton />;
  }

  if (!orgData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="mb-1 text-lg font-semibold">Organization not found</h3>
        <p className="text-muted-foreground text-sm">
          The organization you&apos;re looking for doesn&apos;t exist or has been deleted.
        </p>
      </div>
    );
  }

  const { organization } = orgData;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <h1 className="text-3xl font-bold">{organization.name}</h1>
        <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
          <Trash />
          Delete Organization
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Organization Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-muted-foreground text-sm font-medium">Slug</div>
                  <div className="mt-1 font-mono text-sm">/{organization.slug}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm font-medium">Organization ID</div>
                  <div className="mt-1 font-mono text-sm">{organization.id}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm font-medium">Created</div>
                  <div className="mt-1 text-sm">
                    {format(organization.createdAt, 'MMM d, yyyy')}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm font-medium">Last Updated</div>
                  <div className="mt-1 text-sm">
                    {format(organization.updatedAt, 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <OrgMembersDataTable
            memberships={membershipsData?.memberships ?? []}
            total={membershipsData?.total ?? 0}
            page={membershipsData?.page ?? 1}
            pageSize={membershipsData?.pageSize ?? 20}
            totalPages={membershipsData?.totalPages ?? 0}
            searchQuery={searchValue}
            onSearchChange={handleSearchChange}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            onView={handleViewUser}
            onRemove={handleRemoveMember}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {organization.name} and all related data (memberships,
              tasks, orders). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteOrg.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteOrg.isPending}>
              {deleteOrg.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={membershipDeleteDialogOpen} onOpenChange={setMembershipDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
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
            >
              {deleteMembership.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
