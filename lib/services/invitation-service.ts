/**
 * Invitation Service
 * Handles organization invitation operations
 */
import { and, eq } from 'drizzle-orm';

import { auth } from '@/lib/auth/providers';
import { db } from '@/lib/db/drizzle';
import type { OrgRole, Organization, User } from '@/lib/db/schema';
import { invitations } from '@/lib/db/schema';
import { ERRORS } from '@/lib/services/constants';

/**
 * Check if a pending invitation already exists for an email and organization
 */
export async function checkPendingInvitation(params: {
  email: User['email'];
  organizationId: Organization['id'];
}): Promise<boolean> {
  const pendingInvitations = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.email, params.email),
        eq(invitations.organizationId, params.organizationId),
        eq(invitations.status, 'pending')
      )
    );

  return pendingInvitations.length > 0;
}

/**
 * Create an invitation for a user to join an organization
 * Checks for duplicate pending invitations before creating
 * @throws Error if invitation already exists
 */
export async function createInvitation(params: {
  email: User['email'];
  organizationId: Organization['id'];
  role: OrgRole;
  headers: Headers;
}): Promise<{ success: boolean; message: string }> {
  // Check for duplicate invitation
  const hasPendingInvitation = await checkPendingInvitation({
    email: params.email,
    organizationId: params.organizationId,
  });

  if (hasPendingInvitation) {
    throw new Error('User already has an invitation to this organization', {
      cause: ERRORS.BAD_REQUEST,
    });
  }

  // Create invitation via better-auth
  await auth.api.createInvitation({
    body: {
      email: params.email,
      role: params.role,
      organizationId: params.organizationId,
      resend: true,
    },
    headers: params.headers,
  });

  return {
    success: true,
    message: 'Member invited successfully',
  };
}

/**
 * Cancel a pending invitation
 */
export async function cancelInvitation(params: {
  invitationId: (typeof invitations.$inferSelect)['id'];
  headers: Headers;
}): Promise<{ success: boolean; message: string }> {
  await auth.api.cancelInvitation({
    body: {
      invitationId: params.invitationId,
    },
    headers: params.headers,
  });

  return {
    success: true,
    message: 'Invitation cancelled successfully',
  };
}
