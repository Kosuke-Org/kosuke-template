/**
 * Organization Utilities
 * Helper functions for organization operations
 */

import { db } from '@/lib/db';
import { organizations, orgMemberships, teams, teamMemberships } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type {
  Organization,
  OrgMembership,
  OrgRoleValue,
  Team,
  TeamMembership,
} from '@/lib/types';

/**
 * Slug generation
 * Generates a URL-friendly slug from organization name
 */
export function generateOrgSlug(name: string): string {
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
 * Role checks
 * Check if role has specific permissions
 */
export function isOrgAdmin(role: string): boolean {
  return role === 'org:admin';
}

export function isOrgMember(role: string): boolean {
  return role === 'org:member' || role === 'org:admin';
}

export function canManageOrg(role: string): boolean {
  return isOrgAdmin(role);
}

export function canInviteMembers(role: string): boolean {
  // Currently only admins, but can be extended
  return isOrgAdmin(role);
}

export function canManageTeams(role: string): boolean {
  return isOrgAdmin(role);
}

export function canManageBilling(role: string): boolean {
  return isOrgAdmin(role);
}

/**
 * Membership checks
 * Check if user is a member of an organization
 */
export async function isUserOrgMember(
  clerkUserId: string,
  organizationId: string
): Promise<boolean> {
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

  return !!membership;
}

/**
 * Get user's role in an organization
 */
export async function getUserOrgRole(
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
 * Get organization by slug
 */
export async function getOrgBySlug(slug: string): Promise<Organization | null> {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
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
 * Get all memberships for a user
 */
export async function getUserMemberships(clerkUserId: string): Promise<OrgMembership[]> {
  return await db
    .select()
    .from(orgMemberships)
    .where(eq(orgMemberships.clerkUserId, clerkUserId));
}

/**
 * Get all members of an organization
 */
export async function getOrgMembers(organizationId: string): Promise<OrgMembership[]> {
  return await db
    .select()
    .from(orgMemberships)
    .where(eq(orgMemberships.organizationId, organizationId));
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

/**
 * Team utilities
 * Get all teams in an organization
 */
export async function getOrgTeams(organizationId: string): Promise<Team[]> {
  return await db.select().from(teams).where(eq(teams.organizationId, organizationId));
}

/**
 * Get team by ID
 */
export async function getTeamById(teamId: string): Promise<Team | null> {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);

  return team || null;
}

/**
 * Check if user is member of a team
 */
export async function isUserTeamMember(clerkUserId: string, teamId: string): Promise<boolean> {
  const [membership] = await db
    .select()
    .from(teamMemberships)
    .where(and(eq(teamMemberships.clerkUserId, clerkUserId), eq(teamMemberships.teamId, teamId)))
    .limit(1);

  return !!membership;
}

/**
 * Get user's teams in an organization
 */
export async function getUserTeams(
  clerkUserId: string,
  organizationId: string
): Promise<Team[]> {
  const result = await db
    .select({
      id: teams.id,
      organizationId: teams.organizationId,
      name: teams.name,
      description: teams.description,
      color: teams.color,
      createdBy: teams.createdBy,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
    })
    .from(teams)
    .innerJoin(teamMemberships, eq(teamMemberships.teamId, teams.id))
    .where(
      and(
        eq(teamMemberships.clerkUserId, clerkUserId),
        eq(teams.organizationId, organizationId)
      )
    );

  return result;
}

/**
 * Get all members of a team
 */
export async function getTeamMembers(teamId: string): Promise<TeamMembership[]> {
  return await db.select().from(teamMemberships).where(eq(teamMemberships.teamId, teamId));
}

/**
 * Settings helpers
 * Parse organization settings from JSON string
 */
export function parseOrgSettings(settingsJson: string): Record<string, unknown> {
  try {
    return JSON.parse(settingsJson);
  } catch {
    return {};
  }
}

/**
 * Stringify organization settings to JSON
 */
export function stringifyOrgSettings(settings: Record<string, unknown>): string {
  return JSON.stringify(settings);
}

/**
 * Validation helpers
 * Validate organization name
 */
export function isValidOrgName(name: string): boolean {
  return name.length >= 1 && name.length <= 100;
}

/**
 * Validate organization slug
 */
export function isValidOrgSlug(slug: string): boolean {
  // Slug must be lowercase, alphanumeric with hyphens, 1-50 characters
  return /^[a-z0-9-]{1,50}$/.test(slug);
}

/**
 * Validate team name
 */
export function isValidTeamName(name: string): boolean {
  return name.length >= 1 && name.length <= 100;
}

/**
 * Validate hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}
