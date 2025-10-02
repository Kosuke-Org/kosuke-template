/**
 * Organization Domain Types
 * Centralized type definitions for organizations, teams, and memberships
 */

// Re-export schema types (ALWAYS re-export even if not extending)
export type {
  Organization,
  NewOrganization,
  OrgMembership,
  NewOrgMembership,
  Team,
  NewTeam,
  TeamMembership,
  NewTeamMembership,
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
 * Team Role Constants
 * Enum-like object for team roles
 */
export const TeamRole = {
  LEAD: 'lead',
  MEMBER: 'member',
} as const;

export type TeamRoleValue = (typeof TeamRole)[keyof typeof TeamRole];

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

export function isTeamLead(role: string): role is 'lead' {
  return role === TeamRole.LEAD;
}

export function isTeamMember(role: string): role is 'member' {
  return role === TeamRole.MEMBER;
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

export function canManageTeams(role: OrgRoleValue): boolean {
  return role === OrgRole.ADMIN;
}

export function canManageBilling(role: OrgRoleValue): boolean {
  return role === OrgRole.ADMIN;
}

export function canManageTeam(role: OrgRoleValue, teamRole?: TeamRoleValue): boolean {
  return role === OrgRole.ADMIN || teamRole === TeamRole.LEAD;
}
