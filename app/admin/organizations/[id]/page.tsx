'use client';

import { use, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Loader2, Trash } from 'lucide-react';
import { z } from 'zod';

import { trpc } from '@/lib/trpc/client';
import { adminUpdateOrgSchema } from '@/lib/trpc/schemas/admin';

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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { OrgMembersDataTable } from './components/org-members-data-table';

type OrgFormValues = z.infer<typeof adminUpdateOrgSchema>;

function OrgDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-44" />
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="flex flex-col gap-10 lg:flex-row">
            <Card className="max-w-4xl lg:flex-1">
              <CardHeader>
                <Skeleton className="h-6 w-64" />
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-10 w-32" />
                </div>
              </CardContent>
            </Card>

            <aside className="space-y-6 lg:block">
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-32" />
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

interface OrgDetailPageProps {
  params: Promise<{
    id: string;
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
    { id: resolvedParams.id },
    {
      staleTime: 1000 * 60 * 2,
    }
  );

  const utils = trpc.useUtils();

  const form = useForm<Omit<OrgFormValues, 'id'>>({
    resolver: zodResolver(adminUpdateOrgSchema.omit({ id: true })),
    values: {
      name: orgData?.organization.name || '',
      slug: orgData?.organization.slug || '',
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

  const updateOrgMutation = trpc.admin.organizations.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Organization updated successfully',
      });
      utils.admin.organizations.get.invalidate({ id: resolvedParams.id });
      utils.admin.organizations.list.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteOrg = trpc.admin.organizations.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Organization deleted successfully',
      });
      utils.admin.organizations.list.invalidate();
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

  const onSubmit = async (data: Omit<OrgFormValues, 'id'>) => {
    if (!orgData) return;
    await updateOrgMutation.mutateAsync({
      id: orgData.organization.id,
      ...data,
    });
  };

  const watchedName = useWatch({
    control: form.control,
    name: 'name',
  });

  const watchedSlug = useWatch({
    control: form.control,
    name: 'slug',
  });

  const hasChanges =
    watchedName !== orgData?.organization.name || watchedSlug !== orgData?.organization.slug;

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
        <h1 className="text-2xl font-bold">{organization.name}</h1>
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
          <div className="flex flex-col gap-10 lg:flex-row">
            <Card className="max-w-4xl lg:flex-1">
              <CardHeader>
                <CardTitle>Organization Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form id="org-form" onSubmit={form.handleSubmit(onSubmit)}>
                  <FieldGroup>
                    <Controller
                      name="name"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="org-name">Name</FieldLabel>
                          <Input
                            {...field}
                            id="org-name"
                            aria-invalid={fieldState.invalid}
                            placeholder="Acme Inc."
                            disabled={updateOrgMutation.isPending}
                          />
                          <FieldDescription>The organization&apos;s visible name</FieldDescription>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="slug"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="org-slug">Slug</FieldLabel>
                          <Input
                            {...field}
                            id="org-slug"
                            aria-invalid={fieldState.invalid}
                            placeholder="acme-inc"
                            disabled={updateOrgMutation.isPending}
                          />
                          <FieldDescription>
                            The organization&apos;s URL identifier (e.g., /org/acme-inc)
                          </FieldDescription>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <div>
                      <Button type="submit" disabled={updateOrgMutation.isPending || !hasChanges}>
                        {updateOrgMutation.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>

            <aside className="space-y-6 lg:block">
              <dl className="space-y-4">
                <div className="space-y-1">
                  <dt className="text-muted-foreground text-xs">Organization ID</dt>
                  <dd className="font-mono text-sm break-all">{organization.id}</dd>
                </div>

                <div className="space-y-1">
                  <dt className="text-muted-foreground text-xs">Created</dt>
                  <dd className="text-sm">{format(organization.createdAt, 'MMM d, yyyy')}</dd>
                </div>
              </dl>
              <span className="text-muted-foreground text-xs">
                Last updated at {format(new Date(organization.updatedAt), 'MMM d, yyyy')}
              </span>
            </aside>
          </div>
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
