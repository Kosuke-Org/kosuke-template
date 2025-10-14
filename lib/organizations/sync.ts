/**
 * Organization Sync Utilities
 * Functions to sync Clerk organizations with local database
 */

import { db } from '@/lib/db';
import { organizations, orgMemberships, activityLogs, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';
import {
  generateUniqueOrgSlug,
  getOrgByClerkId,
  getOrgById,
  getMembershipByClerkId,
} from './utils';

import type {
  Organization,
  OrgMembership,
  NewOrganization,
  NewOrgMembership,
  ClerkOrganizationWebhook,
  ClerkMembershipWebhook,
} from '@/lib/types';

import { ActivityType } from '@/lib/db/schema';
import { syncUserFromClerk } from '@/lib/auth';

/**
 * Sync organization from Clerk API
 * Fetches organization data from Clerk and syncs to local database
 */
export async function syncOrganizationFromClerk(clerkOrgId: string): Promise<Organization> {
  try {
    console.log('🔄 Syncing organization from Clerk:', clerkOrgId);

    // Fetch organization from Clerk
    const client = await clerkClient();
    const clerkOrg = await client.organizations.getOrganization({
      organizationId: clerkOrgId,
    });

    // Check if organization already exists
    const existingOrg = await getOrgByClerkId(clerkOrgId);

    const orgData: Partial<NewOrganization> = {
      clerkOrgId: clerkOrg.id,
      name: clerkOrg.name,
      slug: clerkOrg.slug || (await generateUniqueOrgSlug(clerkOrg.name)),
      logoUrl: (clerkOrg.publicMetadata?.customLogoUrl as string) || null, // Use custom logo from metadata, never Clerk's imageUrl
      settings: JSON.stringify(clerkOrg.publicMetadata || {}),
      updatedAt: new Date(),
    };

    if (existingOrg) {
      // Update existing organization
      console.log('📝 Updating existing organization:', existingOrg.id);

      await db.update(organizations).set(orgData).where(eq(organizations.id, existingOrg.id));

      // Return updated organization
      const [updated] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, existingOrg.id))
        .limit(1);

      return updated;
    } else {
      // Create new organization
      console.log('🆕 Creating new organization');

      const [newOrg] = await db
        .insert(organizations)
        .values({
          ...(orgData as NewOrganization),
          createdAt: new Date(),
        })
        .returning();

      console.log('✅ Organization created:', newOrg.id);
      return newOrg;
    }
  } catch (error) {
    console.error('💥 Error syncing organization from Clerk:', error);
    throw error;
  }
}

/**
 * Sync organization from webhook data
 * Syncs organization using webhook payload (different structure than API)
 */
export async function syncOrgFromWebhook(data: ClerkOrganizationWebhook): Promise<Organization> {
  try {
    console.log('🔄 Syncing organization from webhook:', data.id);

    const existingOrg = await getOrgByClerkId(data.id);

    const orgData: Partial<NewOrganization> = {
      clerkOrgId: data.id,
      name: data.name,
      slug: data.slug || (await generateUniqueOrgSlug(data.name)),
      logoUrl: (data.public_metadata?.customLogoUrl as string) || null, // Use custom logo from metadata, never Clerk's image_url
      settings: JSON.stringify(data.public_metadata || {}),
      updatedAt: new Date(),
    };

    if (existingOrg) {
      // Update existing
      await db.update(organizations).set(orgData).where(eq(organizations.id, existingOrg.id));

      const [updated] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, existingOrg.id))
        .limit(1);

      // Log activity
      await logOrgActivity(data.id, ActivityType.ORG_UPDATED, existingOrg.id);

      return updated;
    } else {
      // Create new
      const [newOrg] = await db
        .insert(organizations)
        .values({
          ...(orgData as NewOrganization),
          createdAt: new Date(),
        })
        .returning();

      // Log activity
      await logOrgActivity(data.id, ActivityType.ORG_CREATED, newOrg.id);

      return newOrg;
    }
  } catch (error) {
    console.error('💥 Error syncing organization from webhook:', error);
    throw error;
  }
}

/**
 * Sync membership from Clerk API
 * Note: Clerk doesn't provide a direct method to get a single membership by ID
 * This function fetches the organization's memberships and finds the specific one
 */
export async function syncMembershipFromClerk(clerkMembershipId: string): Promise<OrgMembership> {
  try {
    console.log('🔄 Syncing membership from Clerk:', clerkMembershipId);

    // First, check if membership exists locally to get the organization ID
    const existingMembership = await getMembershipByClerkId(clerkMembershipId);

    if (!existingMembership) {
      throw new Error('Membership not found locally. Cannot sync without organization context.');
    }

    const localOrg = await getOrgById(existingMembership.organizationId);

    if (!localOrg) {
      throw new Error('Organization not found locally');
    }

    // Fetch all memberships for the organization from Clerk
    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: localOrg.clerkOrgId,
    });

    // Find the specific membership
    const clerkMembership = memberships.data.find((m) => m.id === clerkMembershipId);

    if (!clerkMembership || !clerkMembership.publicUserData) {
      throw new Error(`Membership ${clerkMembershipId} not found in Clerk or missing user data`);
    }

    // Ensure organization data is up-to-date
    const org = await syncOrganizationFromClerk(clerkMembership.organization.id);

    const membershipData: Partial<NewOrgMembership> = {
      clerkMembershipId: clerkMembership.id,
      organizationId: org.id,
      clerkUserId: clerkMembership.publicUserData.userId,
      role: clerkMembership.role as 'org:admin' | 'org:member',
      invitedBy: null, // Not available from API
    };

    // Update existing membership
    await db
      .update(orgMemberships)
      .set(membershipData)
      .where(eq(orgMemberships.id, existingMembership.id));

    const [updated] = await db
      .select()
      .from(orgMemberships)
      .where(eq(orgMemberships.id, existingMembership.id))
      .limit(1);

    return updated;
  } catch (error) {
    console.error('💥 Error syncing membership from Clerk:', error);
    throw error;
  }
}

/**
 * Sync membership from webhook data
 */
export async function syncMembershipFromWebhook(
  data: ClerkMembershipWebhook
): Promise<OrgMembership> {
  try {
    console.log('🔄 Syncing membership from webhook:', data.id);

    // Ensure organization exists
    const org = await getOrgByClerkId(data.organization.id);
    if (!org) {
      throw new Error(`Organization not found: ${data.organization.id}`);
    }

    // Ensure public_user_data is present
    if (!data.public_user_data?.user_id) {
      throw new Error(`Membership ${data.id} is missing public_user_data`);
    }

    const userId = data.public_user_data.user_id;

    // CRITICAL: Ensure user exists in our database before creating membership
    // This handles webhook race condition where organizationMembership.created
    // fires before user.created webhook
    const userExists = await db.query.users.findFirst({ where: eq(users.clerkUserId, userId) });

    if (!userExists) {
      console.log('User not found in database, fetching from Clerk...');
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      await syncUserFromClerk(clerkUser);
      console.log('User synced, proceeding with membership creation');
    }

    const existingMembership = await getMembershipByClerkId(data.id);

    const membershipData: Partial<NewOrgMembership> = {
      clerkMembershipId: data.id,
      organizationId: org.id,
      clerkUserId: userId,
      role: data.role as 'org:admin' | 'org:member',
      invitedBy: null, // Can be extracted from webhook metadata if needed
    };

    if (existingMembership) {
      // Update existing
      await db
        .update(orgMemberships)
        .set(membershipData)
        .where(eq(orgMemberships.id, existingMembership.id));

      const [updated] = await db
        .select()
        .from(orgMemberships)
        .where(eq(orgMemberships.id, existingMembership.id))
        .limit(1);

      // Log activity
      await logOrgActivity(userId, ActivityType.ORG_MEMBER_ROLE_UPDATED, org.id, {
        role: data.role,
      });

      return updated;
    } else {
      // Create new
      const [newMembership] = await db
        .insert(orgMemberships)
        .values({
          ...(membershipData as NewOrgMembership),
          joinedAt: new Date(),
        })
        .returning();

      // Log activity
      await logOrgActivity(userId, ActivityType.ORG_MEMBER_ADDED, org.id);

      return newMembership;
    }
  } catch (error) {
    console.error('💥 Error syncing membership from webhook:', error);
    throw error;
  }
}

/**
 * Bulk sync all organizations for a user
 * Useful for initial sync or periodic refresh
 */
export async function syncAllUserOrganizations(clerkUserId: string): Promise<void> {
  try {
    console.log('🔄 Syncing all organizations for user:', clerkUserId);

    const client = await clerkClient();

    // Get all organization memberships for user
    const { data: memberships } = await client.users.getOrganizationMembershipList({
      userId: clerkUserId,
    });

    console.log(`📊 Found ${memberships.length} organization memberships`);

    // Sync each organization and membership
    for (const membership of memberships) {
      try {
        await syncOrganizationFromClerk(membership.organization.id);
        await syncMembershipFromClerk(membership.id);
      } catch (error) {
        console.error(`Failed to sync membership ${membership.id}:`, error);
        // Continue with other memberships
      }
    }

    console.log('✅ Finished syncing all organizations for user');
  } catch (error) {
    console.error('💥 Error syncing all user organizations:', error);
    throw error;
  }
}

/**
 * Remove organization membership
 * Soft delete by removing from local database
 */
export async function removeOrgMembership(clerkMembershipId: string): Promise<void> {
  try {
    console.log('🗑️ Removing membership:', clerkMembershipId);

    const membership = await getMembershipByClerkId(clerkMembershipId);
    if (!membership) {
      console.log('ℹ️ Membership not found, nothing to remove');
      return;
    }

    // Log activity before deletion
    await logOrgActivity(
      membership.clerkUserId,
      ActivityType.ORG_MEMBER_REMOVED,
      membership.organizationId
    );

    // Delete membership
    await db.delete(orgMemberships).where(eq(orgMemberships.id, membership.id));

    console.log('✅ Membership removed');
  } catch (error) {
    console.error('💥 Error removing membership:', error);
    throw error;
  }
}

/**
 * Soft delete organization
 * Mark as deleted but keep record for data integrity
 */
export async function softDeleteOrganization(clerkOrgId: string): Promise<void> {
  try {
    console.log('🗑️ Soft deleting organization:', clerkOrgId);

    const org = await getOrgByClerkId(clerkOrgId);
    if (!org) {
      console.log('ℹ️ Organization not found, nothing to delete');
      return;
    }

    // Log activity
    await logOrgActivity('system', ActivityType.ORG_DELETED, org.id);

    // Option 1: Soft delete (update name/slug)
    await db
      .update(organizations)
      .set({
        name: `[Deleted] ${org.name}`,
        slug: `deleted-${org.id}`,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, org.id));

    console.log('✅ Organization soft deleted');

    // Option 2: Hard delete (cascade will remove memberships, teams, etc.)
    // await db.delete(organizations).where(eq(organizations.id, org.id));
  } catch (error) {
    console.error('💥 Error deleting organization:', error);
    throw error;
  }
}

/**
 * Log organization activity
 */
async function logOrgActivity(
  clerkUserId: string,
  action: ActivityType,
  orgId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      clerkUserId,
      action,
      timestamp: new Date(),
      metadata: JSON.stringify({
        organizationId: orgId,
        ...metadata,
      }),
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging is non-critical
  }
}
