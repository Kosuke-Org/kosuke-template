/**
 * Member Service
 * Handles organization member operations
 */
import { eq } from 'drizzle-orm';

import { auth } from '@/lib/auth/providers';
import { getStripe } from '@/lib/billing/client';
import { getOrgSubscription } from '@/lib/billing/subscription';
import { db } from '@/lib/db';
import type { OrgMembership, OrgRole, Organization, User } from '@/lib/db/schema';
import { orgSubscriptions } from '@/lib/db/schema';
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
 * When transferring ownership (changing role to 'owner'), automatically cancels any paid subscription
 */
export async function updateMemberRole(params: {
  organizationId: Organization['id'];
  memberId: OrgMembership['id'];
  role: OrgRole;
  headers: Headers;
}): Promise<{ success: boolean; message: string }> {
  // Check if this is an ownership transfer (new role is 'owner')
  const isOwnershipTransfer = params.role === 'owner';

  // If ownership is being transferred, cancel any active paid subscription
  if (isOwnershipTransfer) {
    try {
      const subscription = await getOrgSubscription(params.organizationId);

      // If there's an active paid subscription, cancel it at period end
      if (subscription.activeSubscription?.stripeSubscriptionId) {
        console.log(
          `🔄 Ownership transfer detected - canceling subscription for organization: ${params.organizationId}`
        );

        // Cancel subscription in Stripe
        const stripe = await getStripe();
        await stripe.subscriptions.update(subscription.activeSubscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });

        // Update local database
        await db
          .update(orgSubscriptions)
          .set({
            cancelAtPeriodEnd: 'true',
            canceledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(orgSubscriptions.organizationId, params.organizationId));

        console.log('✅ Subscription canceled due to ownership transfer');
      }
    } catch (error) {
      // Log the error but don't block the ownership transfer
      console.error('⚠️ Error canceling subscription during ownership transfer:', error);
      // Continue with role update even if subscription cancellation fails
    }
  }

  // Update the member role
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
 * auth.api.leaveOrganization already prevents leaving if user is the sole owner (to avoid orphaned organizations with subscriptions)
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
