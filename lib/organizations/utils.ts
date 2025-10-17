/**
 * Organization Utilities
 * Helper functions for organization operations
 */

import { db } from '@/lib/db';
import { organizations, orgMemberships } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { Organization, OrgMembership, OrgRoleValue } from '@/lib/types';

/**
 * Slug generation
 * Generates a URL-friendly slug from organization name
 */
function generateOrgSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start and end
}

/**
 * Generate unique slug by appending number if needed
 */
export async function generateUniqueOrgSlug(name: string): Promise<string> {
  const baseSlug = generateOrgSlug(name);
  let slug = baseSlug;
  let counter = 1;

  // Check if slug exists
  while (true) {
    const existing = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);

    if (existing.length === 0) {
      return slug;
    }

    // Add counter and try again
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * Get user's role in an organization
 */
async function getUserOrgRole(
  clerkUserId: string,
  organizationId: string
): Promise<OrgRoleValue | null> {
  const [membership] = await db
    .select({ role: orgMemberships.role })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.clerkUserId, clerkUserId),
        eq(orgMemberships.organizationId, organizationId)
      )
    )
    .limit(1);

  return membership ? (membership.role as OrgRoleValue) : null;
}

/**
 * Get user's membership in an organization
 */
export async function getUserOrgMembership(
  clerkUserId: string,
  organizationId: string
): Promise<OrgMembership | null> {
  const [membership] = await db
    .select()
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.clerkUserId, clerkUserId),
        eq(orgMemberships.organizationId, organizationId)
      )
    )
    .limit(1);

  return membership || null;
}

/**
 * Check if user is admin of an organization
 */
export async function isUserOrgAdmin(
  clerkUserId: string,
  organizationId: string
): Promise<boolean> {
  const role = await getUserOrgRole(clerkUserId, organizationId);
  return role === 'org:admin';
}

/**
 * Organization retrieval
 * Get organization by Clerk organization ID
 */
export async function getOrgByClerkId(clerkOrgId: string): Promise<Organization | null> {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrgId, clerkOrgId))
    .limit(1);

  return org || null;
}

/**
 * Get organization by internal ID
 */
export async function getOrgById(organizationId: string): Promise<Organization | null> {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  return org || null;
}

/**
 * Get all organizations a user belongs to
 */
export async function getUserOrganizations(clerkUserId: string): Promise<Organization[]> {
  const result = await db
    .select({
      id: organizations.id,
      clerkOrgId: organizations.clerkOrgId,
      name: organizations.name,
      slug: organizations.slug,
      logoUrl: organizations.logoUrl,
      settings: organizations.settings,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
    })
    .from(organizations)
    .innerJoin(orgMemberships, eq(orgMemberships.organizationId, organizations.id))
    .where(eq(orgMemberships.clerkUserId, clerkUserId));

  return result;
}

/**
 * Get membership by Clerk membership ID
 */
export async function getMembershipByClerkId(
  clerkMembershipId: string
): Promise<OrgMembership | null> {
  const [membership] = await db
    .select()
    .from(orgMemberships)
    .where(eq(orgMemberships.clerkMembershipId, clerkMembershipId))
    .limit(1);

  return membership || null;
}
