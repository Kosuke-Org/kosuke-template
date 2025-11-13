/**
 * Organization Domain Types
 * Centralized type definitions for organizations, and memberships
 */

// Re-export schema types (ALWAYS re-export even if not extending)
export type { Organization } from '@/lib/db/schema';
import type { OrgRole } from '@/lib/db/schema';
import type { auth } from '@/lib/auth/providers';

export type FullOrganizationResponse = Awaited<ReturnType<typeof auth.api.getFullOrganization>>;

/**
 * Organization Role Constants
 * Enum-like object for organization roles
 */

export type OrgRoleValue = OrgRole;
export const ORG_ROLES: Record<string, OrgRoleValue> = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;
