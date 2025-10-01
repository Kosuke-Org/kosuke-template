/**
 * Organization Members Page
 * View and manage organization members
 */

'use client';

import { useActiveOrganization } from '@/hooks/use-active-organization';

import { OrgMemberList } from '../components/org-member-list';
import { OrgInviteDialog } from '../components/org-invite-dialog';

export default function OrgMembersPage() {
  const { activeOrganization } = useActiveOrganization();

  if (!activeOrganization) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <OrgInviteDialog organizationId={activeOrganization.id} />
      </div>
      <OrgMemberList organizationId={activeOrganization.id} />
    </div>
  );
}
