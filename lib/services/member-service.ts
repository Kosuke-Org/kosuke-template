/**
 * Member Service
 * Handles organization member operations
 */
import { auth } from '@/lib/auth/providers';
import type { OrgMembership, OrgRole, Organization, User } from '@/lib/db/schema';
import { switchToNextOrganization } from '@/lib/organizations';

/**
 * Get all members of an organization
 */
export async function getOrganizationMembers(params: {
  organizationId: Organization['id'];
  headers: Headers;
}) {
  const result = await auth.api.listMembers({
    query: {
      organizationId: params.organizationId,
    },
    headers: params.headers,
  });

  return result;
}

/**
 * Update a member's role in an organization
 */
export async function updateMemberRole(params: {
  organizationId: Organization['id'];
  memberId: OrgMembership['id'];
  role: OrgRole;
  headers: Headers;
}): Promise<{ success: boolean; message: string }> {
  await auth.api.updateMemberRole({
    body: {
      role: params.role,
      memberId: params.memberId,
      organizationId: params.organizationId,
    },
    headers: params.headers,
  });

  return {
    success: true,
    message: 'Member role updated successfully',
  };
}

/**
 * Remove a member from an organization
 */
export async function removeMember(params: {
  organizationId: Organization['id'];
  memberIdOrEmail: OrgMembership['id'] | User['email'];
  headers: Headers;
}): Promise<{ success: boolean; message: string }> {
  await auth.api.removeMember({
    body: {
      memberIdOrEmail: params.memberIdOrEmail,
      organizationId: params.organizationId,
    },
    headers: params.headers,
  });

  return {
    success: true,
    message: 'Member removed successfully',
  };
}

/**
 * Leave an organization and switch to next available organization
 */
export async function leaveOrganization(params: {
  organizationId: Organization['id'];
  userId: User['id'];
  headers: Headers;
}): Promise<{ success: boolean; message: string }> {
  await auth.api.leaveOrganization({
    body: {
      organizationId: params.organizationId,
    },
    headers: params.headers,
  });

  // Switch to another organization or set active to null if none remain
  await switchToNextOrganization(params.userId);

  return {
    success: true,
    message: 'You have left the organization',
  };
}
