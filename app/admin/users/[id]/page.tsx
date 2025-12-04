'use client';

import { use, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Loader2, Trash2 } from 'lucide-react';
import { z } from 'zod';

import { useAdminMemberships } from '@/app/admin/hooks/use-admin-memberships';

import { trpc } from '@/lib/trpc/client';
import type { adminCreateMembershipSchema } from '@/lib/trpc/schemas/admin';
import { adminUpdateUserSchema } from '@/lib/trpc/schemas/admin';
import { OrgRoleValue } from '@/lib/types';

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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { AddToOrganizationDialog } from './components/add-to-organization-dialog';
import { UserOrganizationsDataTable } from './components/user-organizations-data-table';

type UserFormValues = z.infer<typeof adminUpdateUserSchema>;

function UserDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-32" />
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="flex flex-col gap-10 lg:flex-row">
            <Card className="max-w-4xl lg:flex-1">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <Skeleton className="h-10 w-32" />
                </div>
              </CardContent>
            </Card>

            <aside className="space-y-6">
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-3 w-40" />
            </aside>
          </div>
        </TabsContent>
      </Tabs>
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
  const [addToOrgDialogOpen, setAddToOrgDialogOpen] = useState(false);
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

  const utils = trpc.useUtils();

  const form = useForm<Omit<UserFormValues, 'id'>>({
    resolver: zodResolver(adminUpdateUserSchema.omit({ id: true })),
    values: {
      displayName: userData?.user.displayName || '',
      emailVerified: userData?.user.emailVerified || false,
    },
  });

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

  const { data: membershipsData, refetch: refetchMemberships } =
    trpc.admin.memberships.list.useQuery(
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

  // Fetch all organizations for the add to org dropdown
  const { data: orgsData } = trpc.admin.organizations.list.useQuery(
    {
      page: 1,
      pageSize: 100,
    },
    {
      staleTime: 1000 * 60 * 5,
    }
  );

  const updateUserMutation = trpc.admin.users.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      utils.admin.users.get.invalidate({ id: resolvedParams.id });
      utils.admin.users.list.invalidate();
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
      utils.admin.users.list.invalidate();
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

  const { createMembership, updateMembership, deleteMembership, isDeleting, isCreating } =
    useAdminMemberships({
      onMutationSuccess: refetchMemberships,
    });

  const handleDelete = async () => {
    await deleteUser.mutateAsync({ id: resolvedParams.id });
    setDeleteDialogOpen(false);
  };

  const handleViewOrganization = (id: string) => {
    router.push(`/admin/organizations/${id}`);
  };

  const handleRemoveMembership = (id: string, userName: string, orgName: string) => {
    setMembershipToDelete({ id, userName, orgName });
    setMembershipDeleteDialogOpen(true);
  };

  const handleRoleChange = async (id: string, role: OrgRoleValue) => {
    await updateMembership({ id, role });
  };

  const handleDeleteMembershipConfirm = async () => {
    if (!membershipToDelete) return;
    await deleteMembership({ id: membershipToDelete.id });
    setMembershipDeleteDialogOpen(false);
    setMembershipToDelete(null);
  };

  const handleAddToOrgSubmit = async (data: z.infer<typeof adminCreateMembershipSchema>) => {
    await createMembership(data);
    setAddToOrgDialogOpen(false);
  };

  const onSubmit = async (data: Omit<UserFormValues, 'id'>) => {
    await updateUserMutation.mutateAsync({
      id: resolvedParams.id,
      ...data,
    });
  };

  const watchedDisplayName = useWatch({
    control: form.control,
    name: 'displayName',
  });

  const watchedEmailVerified = useWatch({
    control: form.control,
    name: 'emailVerified',
  });

  const hasChanges =
    watchedDisplayName !== userData?.user.displayName ||
    watchedEmailVerified !== userData?.user.emailVerified;

  const existingOrganizations = membershipsData?.memberships.map(
    (membership) => membership.organization.id
  );

  const availableOrganizations =
    orgsData?.organizations.filter(
      (organization) => !existingOrganizations?.includes(organization.id)
    ) ?? [];

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
        <h1 className="text-2xl font-bold">{user.displayName}</h1>
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
          <div className="flex flex-col gap-10 lg:flex-row">
            <Card className="max-w-4xl lg:flex-1">
              <CardHeader>
                <CardTitle>User Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form id="user-form" onSubmit={form.handleSubmit(onSubmit)}>
                  <FieldGroup>
                    <Controller
                      name="displayName"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="user-display-name">Name</FieldLabel>
                          <Input
                            {...field}
                            id="user-display-name"
                            aria-invalid={fieldState.invalid}
                            placeholder="Enter display name"
                            disabled={updateUserMutation.isPending}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <div>
                      <Button type="submit" disabled={updateUserMutation.isPending || !hasChanges}>
                        {updateUserMutation.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>

            <aside className="space-y-6">
              <dl className="space-y-4">
                <div className="space-y-1">
                  <dt className="text-muted-foreground text-xs">User ID</dt>
                  <dd className="text-sm break-all">{user.id}</dd>
                </div>

                <div className="space-y-1">
                  <dt className="text-muted-foreground text-xs">Email</dt>
                  <dd className="text-sm">{user.email}</dd>
                </div>

                <div className="space-y-1">
                  <dt className="text-muted-foreground text-xs">User since</dt>
                  <dd className="text-sm">{format(new Date(user.createdAt), 'MMM d, yyyy')}</dd>
                </div>
              </dl>
              <span className="text-muted-foreground text-xs">
                Last updated at {format(new Date(user.updatedAt), 'MMM d, yyyy')}
              </span>
            </aside>
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
            onRoleChange={handleRoleChange}
            onAdd={() => setAddToOrgDialogOpen(true)}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={deleteDialogOpen || deleteUser.isPending}
        onOpenChange={setDeleteDialogOpen}
      >
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

      <AlertDialog
        open={membershipDeleteDialogOpen || isDeleting}
        onOpenChange={setMembershipDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Membership?</AlertDialogTitle>
            <AlertDialogDescription>
              {membershipToDelete &&
                `Are you sure you want to remove ${membershipToDelete.userName} from ${membershipToDelete.orgName}? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMembershipConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Remove Membership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddToOrganizationDialog
        open={addToOrgDialogOpen || isCreating}
        onOpenChange={setAddToOrgDialogOpen}
        onSubmit={handleAddToOrgSubmit}
        isPending={isCreating}
        userId={resolvedParams.id}
        availableOrganizations={availableOrganizations}
      />
    </div>
  );
}
