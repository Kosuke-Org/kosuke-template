/**
 * Onboarding Page
 * Organization creation for new users after sign-up
 */

'use client';

import { useUser } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useCreateOrganization } from '@/hooks/use-create-organization';
import { createOrgFormSchema } from '@/lib/trpc/schemas/organizations';

type OrganizationFormValues = z.infer<typeof createOrgFormSchema>;

export default function OnboardingPage() {
  const { isLoaded } = useUser();
  const { createOrganization, isCreating } = useCreateOrganization();

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(createOrgFormSchema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = (data: OrganizationFormValues) => {
    createOrganization(data);
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
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
                      <Input placeholder="Acme Inc." {...field} disabled={isCreating} autoFocus />
                    </FormControl>
                    <FormDescription>
                      This is your organization&apos;s visible name. You can change it later.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
