/**
 * Organization General Form
 * Form for updating organization name
 */

'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2, Trash } from 'lucide-react';
import { z } from 'zod';

import { orgGeneralFormSchema } from '@/lib/trpc/schemas/organizations';
import { ORG_ROLES, type FullOrganizationResponse as Organization } from '@/lib/types/organization';

import { useDeleteOrganization } from '@/hooks/use-delete-organization';
import { useOrganization } from '@/hooks/use-organization';
import { useUpdateOrganization } from '@/hooks/use-update-organization';

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

type OrgFormValues = z.infer<typeof orgGeneralFormSchema>;

export function OrgGeneralForm({ organization }: { organization: Organization }) {
  const { updateOrganization, isUpdating } = useUpdateOrganization();
  const { deleteOrganization, isDeleting } = useDeleteOrganization();
  const { currentUserRole } = useOrganization();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useForm<OrgFormValues>({
    resolver: zodResolver(orgGeneralFormSchema),
    defaultValues: {
      name: organization?.name ?? '',
    },
  });

  const onSubmit = (data: OrgFormValues) => {
    if (!organization) return;

    updateOrganization({ organizationId: organization.id, name: data.name });
  };

  const watchedName = useWatch({
    control: form.control,
    name: 'name',
  });

  const hasChanges = watchedName !== organization?.name;
  const isOwner = currentUserRole === ORG_ROLES.OWNER;

  const handleDelete = () => {
    if (!organization) return;
    deleteOrganization({ organizationId: organization.id });
  };

  if (!organization) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>Update your organization&apos;s information</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} disabled={isUpdating} />
                    </FormControl>
                    <FormDescription>
                      This is your organization&apos;s visible name.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isUpdating || !hasChanges}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isOwner && (
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete this organization and all associated data. This action cannot be
              undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash />
              Delete Organization
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteDialogOpen || isDeleting} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-destructive h-5 w-5" />
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              This will permanently delete the organization &quot;{organization.name}&quot; and all
              associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 text-white"
            >
              {isDeleting && <Loader2 className="animate-spin" />}
              Delete organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
