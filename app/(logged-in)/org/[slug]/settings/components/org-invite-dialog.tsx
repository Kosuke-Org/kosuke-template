/**
 * Organization Invite Dialog
 * Invite new members to the organization
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UserPlus } from 'lucide-react';
import { z } from 'zod';

import { orgInviteFormSchema } from '@/lib/trpc/schemas/organizations';
import { ORG_ROLES } from '@/lib/types/organization';

import { useOrgInvitation } from '@/hooks/use-org-invitation';
import { useOrganization } from '@/hooks/use-organization';
import { useUser } from '@/hooks/use-user';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

type InviteFormValues = z.infer<typeof orgInviteFormSchema>;

export function OrgInviteDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { user: currentUser } = useUser();
  const { organization, isLoading, currentUserRole } = useOrganization();
  const { inviteMember, isInviting } = useOrgInvitation();

  const organizationId = organization?.id;

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(orgInviteFormSchema),
    defaultValues: {
      email: '',
      role: ORG_ROLES.MEMBER,
    },
  });

  const onSubmit = async ({ email, role }: InviteFormValues) => {
    if (!organizationId) return;

    inviteMember(
      { organizationId, email, role },
      {
        onSuccess: () => {
          form.reset();
          setIsOpen(false);
        },
      }
    );
  };

  if (currentUserRole === ORG_ROLES.MEMBER) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {isLoading || !currentUser ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join this organization. They&apos;ll receive an email with
            instructions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="colleague@example.com"
                      {...field}
                      disabled={isInviting}
                    />
                  </FormControl>
                  <FormDescription>
                    They&apos;ll receive an invitation email to join this organization.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isInviting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Admins can manage organization settings and members.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isInviting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Invitation'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
