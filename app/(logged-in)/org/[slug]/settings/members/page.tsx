/**
 * Organization Members Page
 * View and manage organization members
 */

'use client';

import { OrgInvitationList } from '../components/org-invitation-list';
import { OrgInviteDialog } from '../components/org-invite-dialog';
import { OrgMemberList } from '../components/org-member-list';

export default function OrgMembersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <OrgInviteDialog />
      </div>
      <OrgInvitationList />
      <OrgMemberList />
    </div>
  );
}
