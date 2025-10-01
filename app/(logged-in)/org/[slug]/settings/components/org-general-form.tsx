/**
 * Organization General Form
 * Form for updating organization name
 */

'use client';

import { useState } from 'react';
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
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import type { Organization } from '@/hooks/use-organizations';

const orgFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
});

type OrgFormValues = z.infer<typeof orgFormSchema>;

interface OrgGeneralFormProps {
  organization: Organization;
}

export function OrgGeneralForm({ organization }: OrgGeneralFormProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OrgFormValues>({
    resolver: zodResolver(orgFormSchema),
    defaultValues: {
      name: organization.name,
    },
  });

  const updateOrg = trpc.organizations.updateOrganization.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Organization updated successfully',
      });
      utils.organizations.getUserOrganizations.invalidate();
      utils.organizations.getOrganization.invalidate({ organizationId: organization.id });
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: OrgFormValues) => {
    setIsSubmitting(true);
    updateOrg.mutate({
      organizationId: organization.id,
      name: data.name,
    });
  };

  const hasChanges = form.watch('name') !== organization.name;

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
                    <Input placeholder="Acme Inc." {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormDescription>This is your organization&apos;s visible name.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting || !hasChanges}>
              {isSubmitting ? (
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
