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
export const OrgRole = {
  ADMIN: 'org:admin',
  MEMBER: 'org:member',
} as const;

export type OrgRoleValue = (typeof OrgRole)[keyof typeof OrgRole];

/**
 * Type Guards
 * Runtime type checking utilities
 */
export function isOrgAdmin(role: string): role is 'org:admin' {
  return role === OrgRole.ADMIN;
}

export function isOrgMember(role: string): role is 'org:member' {
  return role === OrgRole.MEMBER;
}

/**
 * Permission Helpers
 * Check if user has specific permissions
 */
export function canManageOrganization(role: OrgRoleValue): boolean {
  return role === OrgRole.ADMIN;
}

export function canInviteMembers(role: OrgRoleValue): boolean {
  return role === OrgRole.ADMIN; // Can be extended to allow members too
}

export function canManageBilling(role: OrgRoleValue): boolean {
  return role === OrgRole.ADMIN;
}
