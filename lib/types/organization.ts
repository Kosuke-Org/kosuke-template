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
  OrgRole,
  TeamRole,
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
 * Extended Organization Types
 * Types that extend base schema types with computed/joined data
 */

export interface OrganizationWithMemberCount {
  id: string;
  clerkOrgId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  settings: string;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
  teamCount: number;
}

export interface OrganizationWithDetails extends OrganizationWithMemberCount {
  isUserAdmin: boolean;
  userRole: OrgRoleValue;
}

export interface OrgMembershipWithUser {
  id: string;
  organizationId: string;
  clerkUserId: string;
  clerkMembershipId: string;
  role: OrgRoleValue;
  joinedAt: Date;
  invitedBy: string | null;
  user: {
    clerkUserId: string;
    email: string;
    displayName: string | null;
    profileImageUrl: string | null;
  };
}

export interface TeamWithMemberCount {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  color: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
}

export interface TeamWithDetails extends TeamWithMemberCount {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  creator: {
    clerkUserId: string;
    displayName: string | null;
    profileImageUrl: string | null;
  };
}

export interface TeamMembershipWithUser {
  id: string;
  teamId: string;
  clerkUserId: string;
  role: TeamRoleValue;
  joinedAt: Date;
  user: {
    clerkUserId: string;
    email: string;
    displayName: string | null;
    profileImageUrl: string | null;
  };
}

/**
 * Organization Context
 * Contains current user's organization context
 */
export interface OrgContext {
  organizationId: string;
  role: OrgRoleValue;
  canManageOrg: boolean;
  canInviteMembers: boolean;
  canManageTeams: boolean;
  canManageBilling: boolean;
}

/**
 * Organization Statistics
 * Aggregated statistics for an organization
 */
export interface OrgStatistics {
  totalMembers: number;
  totalTeams: number;
  totalTasks: number;
  completedTasks: number;
  activeMembersThisWeek: number;
  subscriptionTier: 'free' | 'pro' | 'business';
}

/**
 * Team Statistics
 * Aggregated statistics for a team
 */
export interface TeamStatistics {
  totalMembers: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

/**
 * Organization Settings
 * Parsed settings object for organizations
 */
export interface OrganizationSettings {
  defaultTaskVisibility?: 'personal' | 'team' | 'org';
  allowMemberInvites?: boolean;
  requireAdminApproval?: boolean;
  emailNotifications?: boolean;
  slackIntegration?: {
    enabled: boolean;
    webhookUrl?: string;
  };
  customFields?: Record<string, unknown>;
}

/**
 * Invitation Data
 * Data for organization invitations
 */
export interface OrganizationInvitation {
  email: string;
  role: OrgRoleValue;
  invitedBy: string;
  organizationId: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

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
