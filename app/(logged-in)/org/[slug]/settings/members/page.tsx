/**
 * Organization Members Page
 * View and manage organization members
 */

'use client';

import { useActiveOrganization } from '@/hooks/use-active-organization';
import { Loader2 } from 'lucide-react';

import { Separator } from '@/components/ui/separator';
import { OrgMemberList } from '../components/org-member-list';
import { OrgInviteDialog } from '../components/org-invite-dialog';

export default function OrgMembersPage() {
  const { activeOrganization, isLoading } = useActiveOrganization();

  if (isLoading || !activeOrganization) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Members</h3>
          <p className="text-sm text-muted-foreground">
            Manage who has access to this organization.
          </p>
        </div>
        <OrgInviteDialog organizationId={activeOrganization.id} />
      </div>
      <Separator />
      <OrgMemberList organizationId={activeOrganization.id} />
    </div>
  );
}
