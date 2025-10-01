/**
 * Organization Sync Utilities
 * Functions to sync Clerk organizations with local database
 */

import { db } from '@/lib/db';
import { organizations, orgMemberships, activityLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';
import { generateUniqueOrgSlug, getOrgByClerkId, getMembershipByClerkId } from './utils';
import type { Organization, OrgMembership, NewOrganization, NewOrgMembership } from '@/lib/types';
import { ActivityType } from '@/lib/db/schema';

/**
 * Webhook payload types
 */
export interface ClerkOrgWebhook {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  created_at: number;
  updated_at: number;
  public_metadata?: Record<string, unknown>;
  private_metadata?: Record<string, unknown>;
}

export interface ClerkMembershipWebhook {
  id: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  public_user_data: {
    user_id: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
    identifier: string;
  };
  role: string;
  created_at: number;
  updated_at: number;
}

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
      logoUrl: clerkOrg.imageUrl || null,
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
export async function syncOrgFromWebhook(data: ClerkOrgWebhook): Promise<Organization> {
  try {
    console.log('🔄 Syncing organization from webhook:', data.id);

    const existingOrg = await getOrgByClerkId(data.id);

    const orgData: Partial<NewOrganization> = {
      clerkOrgId: data.id,
      name: data.name,
      slug: data.slug || (await generateUniqueOrgSlug(data.name)),
      logoUrl: data.image_url || null,
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
 */
export async function syncMembershipFromClerk(clerkMembershipId: string): Promise<OrgMembership> {
  try {
    console.log('🔄 Syncing membership from Clerk:', clerkMembershipId);

    // Fetch membership from Clerk
    const client = await clerkClient();
    const clerkMembership = await client.organizations.getOrganizationMembership({
      organizationMembershipId: clerkMembershipId,
    });

    // Ensure organization exists in local database
    const org = await syncOrganizationFromClerk(clerkMembership.organization.id);

    // Check if membership already exists
    const existingMembership = await getMembershipByClerkId(clerkMembershipId);

    const membershipData: Partial<NewOrgMembership> = {
      clerkMembershipId: clerkMembership.id,
      organizationId: org.id,
      clerkUserId: clerkMembership.publicUserData.userId,
      role: clerkMembership.role as 'org:admin' | 'org:member',
      invitedBy: null, // Not available from API
    };

    if (existingMembership) {
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
    } else {
      // Create new membership
      const [newMembership] = await db
        .insert(orgMemberships)
        .values({
          ...(membershipData as NewOrgMembership),
          joinedAt: new Date(),
        })
        .returning();

      return newMembership;
    }
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

    const existingMembership = await getMembershipByClerkId(data.id);

    const membershipData: Partial<NewOrgMembership> = {
      clerkMembershipId: data.id,
      organizationId: org.id,
      clerkUserId: data.public_user_data.user_id,
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
      await logOrgActivity(
        data.public_user_data.user_id,
        ActivityType.ORG_MEMBER_ROLE_UPDATED,
        org.id,
        { role: data.role }
      );

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
      await logOrgActivity(data.public_user_data.user_id, ActivityType.ORG_MEMBER_ADDED, org.id);

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
