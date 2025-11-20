/**
 * Onboarding Page
 * Organization creation for new users after sign-up
 */

'use client';

import { useForm } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

import { createOrgFormSchema } from '@/lib/trpc/schemas/organizations';

import { useAuth } from '@/hooks/use-auth';
import { useCreateOrganization } from '@/hooks/use-create-organization';

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

type OrganizationFormValues = z.infer<typeof createOrgFormSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoading } = useAuth();
  const { createOrganization, isCreating } = useCreateOrganization();

  const isSubmitting = isCreating || isLoading;

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(createOrgFormSchema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = (data: OrganizationFormValues) => {
    createOrganization(data, {
      onSuccess: (slug) => {
        router.push(`/org/${slug}/dashboard`);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-4 flex flex-1 items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Create your workspace</CardTitle>
          <CardDescription>
            Let&apos;s get started by creating your first workspace. You can invite team members
            later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workspace Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} disabled={isSubmitting} autoFocus />
                    </FormControl>
                    <FormDescription>
                      This is your organization&apos;s visible name. You can change it later.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Creating workspace...
                  </>
                ) : (
                  'Create Workspace'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
