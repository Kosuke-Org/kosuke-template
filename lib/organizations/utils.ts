/**
 * Organization Utilities
 * Helper functions for organization operations
 */
import { eq } from 'drizzle-orm';

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
