/**
 * Organization Domain Types
 * Centralized type definitions for organizations, and memberships
 */

// Re-export schema types (ALWAYS re-export even if not extending)
export type { Organization } from '@/lib/db/schema';

export type { FullOrganizationResponse } from '@/lib/auth/client';

/**
 * Organization Role Constants
 * Enum-like object for organization roles
 */
export const ORG_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export type OrgRoleValue = (typeof ORG_ROLES)[keyof typeof ORG_ROLES];
