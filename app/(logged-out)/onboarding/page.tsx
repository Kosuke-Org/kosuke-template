/**
 * Onboarding Page
 * Organization creation for new users after sign-up
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Loader2, Building2 } from 'lucide-react';
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
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';

const organizationSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .max(100, 'Name must be less than 100 characters'),
});

type OrganizationFormValues = z.infer<typeof organizationSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded } = useUser();
  const { toast } = useToast();
  const { createOrganizationAsync, organizations, isLoading: isLoadingOrgs } = useOrganizations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
    },
  });

  // Redirect if user already has organizations
  if (isLoaded && !isLoadingOrgs && organizations.length > 0) {
    const firstOrg = organizations[0];
    router.replace(`/org/${firstOrg.slug}/dashboard`);
    return null;
  }

  const onSubmit = async (data: OrganizationFormValues) => {
    try {
      setIsSubmitting(true);

      const result = await createOrganizationAsync({
        name: data.name,
      });

      // Wait a moment for webhook to sync
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast({
        title: 'Success!',
        description: 'Your workspace has been created.',
      });

      // Redirect to the new organization
      router.push(`/org/${result.slug}/dashboard`);
    } catch (error) {
      console.error('Error creating organization:', error);
      setIsSubmitting(false);
      toast({
        title: 'Error',
        description: 'Failed to create workspace. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!isLoaded || isLoadingOrgs) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-2xl">Create your workspace</CardTitle>
            </div>
          </div>
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
