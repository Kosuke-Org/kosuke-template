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

/**
 * Form-specific schema for creating organizations
 * Used for client-side form validation (slug is auto-generated)
 */
export const createOrgFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .max(100, 'Name must be less than 100 characters'),
});

export const updateOrganizationSchema = z.object({
  organizationId: z.uuid('Invalid organization ID'),
  name: z.string().min(1).max(100).optional(),
  logoUrl: z.url('Invalid URL').nullable().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Form-specific schema for organization general settings
 * Used for client-side form validation
 */
export const orgGeneralFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
});

export const getOrganizationSchema = z.object({
  organizationId: z.uuid('Invalid organization ID'),
});

/**
 * Membership Schemas
 */
export const inviteMemberSchema = z.object({
  organizationId: z.uuid('Invalid organization ID'),
  email: z.email('Invalid email address'),
  role: z.enum(['org:admin', 'org:member']).default('org:member'),
});

/**
 * Form-specific schema for inviting members
 * Used for client-side form validation (organizationId provided separately)
 */
export const orgInviteFormSchema = z.object({
  email: z.email('Invalid email address'),
  role: z.enum(['org:admin', 'org:member']),
});

export const updateMemberRoleSchema = z.object({
  organizationId: z.uuid('Invalid organization ID'),
  clerkUserId: z.string().min(1, 'User ID is required'),
  role: z.enum(['org:admin', 'org:member']),
});

export const removeMemberSchema = z.object({
  organizationId: z.uuid('Invalid organization ID'),
  clerkUserId: z.string().min(1, 'User ID is required'),
});

export const getOrgMembersSchema = z.object({
  organizationId: z.uuid('Invalid organization ID'),
});
