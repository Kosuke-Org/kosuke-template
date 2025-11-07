/**
 * Organization General Form
 * Form for updating organization name
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { orgGeneralFormSchema } from '@/lib/trpc/schemas/organizations';
import { useUpdateOrganization } from '@/hooks/use-update-organization';
import type { FullOrganizationResponse as Organization } from '@/lib/types/organization';

type OrgFormValues = z.infer<typeof orgGeneralFormSchema>;

export function OrgGeneralForm({ organization }: { organization: Organization }) {
  const { updateOrganization, isUpdating } = useUpdateOrganization();

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

  const hasChanges = form.watch('name') !== organization?.name;

  if (!organization) return null;

  return (
    <>
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
                  <FormDescription>This is your organization&apos;s visible name.</FormDescription>
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
    </>
  );
}
