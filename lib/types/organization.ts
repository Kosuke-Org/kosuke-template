/**
 * Organization Domain Types
 * Centralized type definitions for organizations, and memberships
 */

// Re-export schema types (ALWAYS re-export even if not extending)
export type {
  Organization,
  NewOrganization,
  OrgMembership,
  NewOrgMembership,
} from '@/lib/db/schema';

/**
 * Organization Role Constants
 * Enum-like object for organization roles
 */
const _ORG_ROLES = {
  ADMIN: 'org:admin',
  MEMBER: 'org:member',
} as const;

export type OrgRoleValue = (typeof _ORG_ROLES)[keyof typeof _ORG_ROLES];
