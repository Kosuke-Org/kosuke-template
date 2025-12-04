'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import type { z } from 'zod';

import { adminCreateOrgSchema } from '@/lib/trpc/schemas/admin';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type CreateOrgFormValues = z.infer<typeof adminCreateOrgSchema>;

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateOrgFormValues) => Promise<void>;
  isPending: boolean;
  availableUsers?: Array<{ id: string; email: string; displayName: string }>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  availableUsers = [],
}: CreateOrganizationDialogProps) {
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const form = useForm<CreateOrgFormValues>({
    resolver: zodResolver(adminCreateOrgSchema),
    defaultValues: {
      name: '',
      slug: '',
      ownerId: undefined,
    },
  });

  const watchedName = useWatch({ control: form.control, name: 'name' });

  // Auto-generate slug from name if not manually edited
  useEffect(() => {
    if (!slugManuallyEdited && watchedName) {
      form.setValue('slug', slugify(watchedName), { shouldValidate: true });
    }
  }, [watchedName, slugManuallyEdited, form]);

  const handleSubmit = async (data: CreateOrgFormValues) => {
    await onSubmit(data);
    form.reset();
    setSlugManuallyEdited(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setSlugManuallyEdited(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Create a new organization. You can optionally assign an owner from existing users.
          </DialogDescription>
        </DialogHeader>

        <form id="create-org-form" onSubmit={form.handleSubmit(handleSubmit)}>
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="name">Organization Name</FieldLabel>
                  <Input
                    {...field}
                    id="name"
                    aria-invalid={fieldState.invalid}
                    placeholder="Acme Inc"
                    disabled={isPending}
                  />
                  <FieldDescription>The public name of the organization</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="slug"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="slug">Slug</FieldLabel>
                  <Input
                    {...field}
                    id="slug"
                    aria-invalid={fieldState.invalid}
                    placeholder="acme-inc"
                    disabled={isPending}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      field.onChange(e);
                    }}
                  />
                  <FieldDescription>
                    URL-friendly identifier (auto-generated from name)
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="ownerId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="ownerId">Owner (Optional)</FieldLabel>
                  <Select
                    value={field.value ?? '__none__'}
                    onValueChange={(value) =>
                      field.onChange(value === '__none__' ? undefined : value)
                    }
                    disabled={isPending}
                  >
                    <SelectTrigger id="ownerId">
                      <SelectValue placeholder="Select a user as owner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No owner</SelectItem>
                      {availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.displayName} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Optionally assign an existing user as the organization owner
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="create-org-form" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
