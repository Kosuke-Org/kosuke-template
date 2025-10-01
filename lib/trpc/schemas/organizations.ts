/**
 * Organization Schemas
 * Zod validation schemas for organization operations (client-safe)
 * NO SERVER DEPENDENCIES - only Zod imports allowed!
 */

import { z } from 'zod';

/**
 * Organization Schemas
 */
export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100, 'Name too long'),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
});

export const updateOrganizationSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  name: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url('Invalid URL').nullable().optional(),
  settings: z.record(z.unknown()).optional(),
});

/**
 * Form-specific schema for organization general settings
 * Used for client-side form validation
 */
export const orgGeneralFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
});

export const deleteOrganizationSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
});

export const getOrganizationSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
});

/**
 * Membership Schemas
 */
export const inviteMemberSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['org:admin', 'org:member']).default('org:member'),
});

export const updateMemberRoleSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  clerkUserId: z.string().min(1, 'User ID is required'),
  role: z.enum(['org:admin', 'org:member']),
});

export const removeMemberSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  clerkUserId: z.string().min(1, 'User ID is required'),
});

export const getOrgMembersSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
});

/**
 * Team Schemas
 */
export const createTeamSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  name: z.string().min(1, 'Team name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
    .optional(),
});

export const updateTeamSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
});

export const deleteTeamSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
});

export const getTeamSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
});

export const getTeamsSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
});

/**
 * Team Membership Schemas
 */
export const addTeamMemberSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
  clerkUserId: z.string().min(1, 'User ID is required'),
  role: z.enum(['lead', 'member']).default('member'),
});

export const updateTeamMemberRoleSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
  clerkUserId: z.string().min(1, 'User ID is required'),
  role: z.enum(['lead', 'member']),
});

export const removeTeamMemberSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
  clerkUserId: z.string().min(1, 'User ID is required'),
});

export const getTeamMembersSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
});
