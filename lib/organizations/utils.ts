/**
 * Organization Utilities
 * Helper functions for organization operations
 */

import { db } from '@/lib/db';
import { organizations, orgMemberships } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { Organization, OrgRoleValue } from '@/lib/types';
import { ORG_ROLES } from '../types/organization';

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
  userId: string,
  organizationId: string
): Promise<OrgRoleValue | null> {
  const [membership] = await db
    .select({ role: orgMemberships.role })
    .from(orgMemberships)
    .where(
      and(eq(orgMemberships.userId, userId), eq(orgMemberships.organizationId, organizationId))
    )
    .limit(1);

  return membership ? (membership.role as OrgRoleValue) : null;
}

/**
 * Check if user is admin of an organization
 */
export async function isUserOrgAdmin(userId: string, organizationId: string): Promise<boolean> {
  const role = await getUserOrgRole(userId, organizationId);
  return role === ORG_ROLES.ADMIN;
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
