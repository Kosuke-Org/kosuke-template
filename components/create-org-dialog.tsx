/**
 * Create Organization Dialog
 * Dialog for creating new workspaces from the sidebar
 */

'use client';

import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface CreateOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrganizationCreated?: (slug: string) => void;
}

export function CreateOrgDialog({
  open,
  onOpenChange,
  onOrganizationCreated,
}: CreateOrgDialogProps) {
  const { createOrganization, isCreating } = useCreateOrganization();

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(createOrgFormSchema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = (data: OrganizationFormValues) => {
    createOrganization(data, {
      onSuccess: (slug) => {
        onOpenChange(false);
        form.reset();

        onOrganizationCreated?.(slug);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Create Workspace</DialogTitle>
          </div>
          <DialogDescription>
            Create a new workspace to organize your projects and team.
          </DialogDescription>
        </DialogHeader>
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

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Workspace'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
