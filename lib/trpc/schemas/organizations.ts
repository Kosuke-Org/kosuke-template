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
  slug: z.string().min(1).max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
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
export const createInvitationSchema = z.object({
  organizationId: z.uuid('Invalid organization ID'),
  email: z.email('Invalid email address'),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
});

/**
 * Form-specific schema for inviting members
 * Used for client-side form validation (organizationId provided separately)
 */
export const orgInviteFormSchema = z.object({
  email: z.email('Invalid email address'),
  role: z.enum(['owner', 'admin', 'member']),
});

export const updateMemberRoleSchema = z.object({
  organizationId: z.uuid('Invalid organization ID'),
  memberId: z.string().min(1, 'User ID is required'),
  role: z.enum(['owner', 'admin', 'member']),
});

export const removeMemberSchema = z.object({
  organizationId: z.uuid('Invalid organization ID'),
  memberIdOrEmail: z.string().min(1, 'User ID or email is required'),
});

export const leaveOrganizationSchema = z.object({
  organizationId: z.uuid('Invalid organization ID'),
});

export const getOrgMembersSchema = z.object({
  organizationId: z.uuid('Invalid organization ID'),
  limit: z.number().int().positive().default(100),
  offset: z.number().int().positive().default(0),
  sortBy: z.enum(['createdAt']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
  filterField: z.string().optional(),
  filterOperator: z
    .enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains'] as const)
    .default('eq'),
  filterValue: z.string().optional(),
});
