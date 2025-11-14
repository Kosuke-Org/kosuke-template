/**
 * Organization Members Page
 * View and manage organization members
 */

'use client';

import { OrgMemberList } from '../components/org-member-list';
import { OrgInviteDialog } from '../components/org-invite-dialog';
import { OrgInvitationList } from '../components/org-invitation-list';

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
