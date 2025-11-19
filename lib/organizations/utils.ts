/**
 * Organization Utilities
 * Helper functions for organization operations
 */
import { headers } from 'next/headers';

import { eq } from 'drizzle-orm';

import { auth } from '@/lib/auth/providers';
import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import type { Organization } from '@/lib/types';

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
 * Switch to another organization after leaving/deleting the current one
 * If the user has other organizations, sets the first one as active
 * Otherwise, sets active organization to null (user will be redirected to onboarding)
 */
export async function switchToNextOrganization(userId: string): Promise<void> {
  const headersList = await headers();

  // Get user's remaining organizations
  const otherOrgs = await auth.api.listOrganizations({
    query: {
      userId,
    },
    headers: headersList,
  });

  if (otherOrgs.length > 0) {
    // Switch to the first available organization
    const nextOrg = otherOrgs[0];
    const { id, slug } = nextOrg;

    await auth.api.setActiveOrganization({
      body: {
        organizationId: id,
        organizationSlug: slug,
      },
      headers: headersList,
    });
  } else {
    // No other organizations - set active to null
    await auth.api.setActiveOrganization({
      body: {
        organizationId: null,
      },
      headers: headersList,
    });
  }
}
