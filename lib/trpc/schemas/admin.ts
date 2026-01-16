import { z } from 'zod';

import { orgRoleEnum } from '@/lib/db/schema';
import { ORG_ROLES, USER_ROLES } from '@/lib/types/organization';

const jobStatusEnum = z.enum(['completed', 'failed', 'active', 'waiting', 'delayed']);

export type JobStatus = z.infer<typeof jobStatusEnum>;

// User Management Schemas
export const adminUserListFiltersSchema = z
  .object({
    searchQuery: z.string().optional(),
    page: z.number().min(1).default(1),
    pageSize: z.number().min(1).max(100).default(10),
  })
  .optional();

export const adminUpdateUserSchema = z.object({
  id: z.uuid(),
  displayName: z.string().min(1).max(255).optional(),
  email: z.email().optional(),
  emailVerified: z.boolean().optional(),
  role: z.enum([USER_ROLES.ADMIN, USER_ROLES.USER]).optional(),
});

export const adminDeleteUserSchema = z.object({
  id: z.uuid(),
});

export const adminCreateUserSchema = z.object({
  email: z.email('Invalid email address'),
  organizationId: z.uuid().optional(),
  role: z.enum([USER_ROLES.ADMIN, USER_ROLES.USER]).optional().default(USER_ROLES.USER),
  orgRole: z.enum(orgRoleEnum.enumValues).optional().default(ORG_ROLES.MEMBER),
});

// Organization Management Schemas
export const adminOrgListFiltersSchema = z
  .object({
    searchQuery: z.string().optional(),
    page: z.number().min(1).default(1),
    pageSize: z.number().min(1).max(100).default(10),
  })
  .optional();

export const adminUpdateOrgSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
});

export const adminDeleteOrgSchema = z.object({
  id: z.uuid(),
});

export const adminCreateOrgSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(255),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  ownerId: z.uuid('Owner is required for billing setup'),
});

// Organization Membership Schemas
export const adminMembershipListFiltersSchema = z
  .object({
    searchQuery: z.string().optional(),
    organizationId: z.uuid().optional(),
    userId: z.uuid().optional(),
    role: z.enum(orgRoleEnum.enumValues).optional(),
    page: z.number().min(1).default(1),
    pageSize: z.number().min(5).max(100).default(10),
  })
  .optional();

export const adminUpdateMembershipSchema = z.object({
  id: z.uuid(),
  role: z.enum(orgRoleEnum.enumValues),
});

export const adminDeleteMembershipSchema = z.object({
  id: z.uuid(),
});

export const adminCreateMembershipSchema = z.object({
  organizationId: z.uuid(),
  userId: z.uuid(),
  role: z.enum(orgRoleEnum.enumValues),
});

export const adminJobListFiltersSchema = z
  .object({
    queueName: z.string().optional(),
    status: jobStatusEnum.optional(),
    page: z.number().min(1).default(1),
    pageSize: z.number().min(5).max(100).default(20),
  })
  .optional();

export const adminTriggerScheduledJobSchema = z.object({
  queueName: z.string(),
  jobName: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
});

// RAG (File Search Stores) Schemas
export const adminGetStoreDocumentsSchema = z.object({
  storeName: z.string(),
});

export const adminDeleteFileSearchStoreSchema = z.object({
  storeName: z.string(),
});

export const adminDeleteAllDocumentsSchema = z.object({
  storeName: z.string(),
});

export const adminDeleteDanglingDocumentsSchema = z.object({
  storeName: z.string(),
});

// LLM Logs Schemas
export const adminLlmLogsListSchema = z
  .object({
    searchQuery: z.string().optional(),
    organizationId: z.uuid().optional(),
    chatSessionId: z.uuid().optional(),
    dateFrom: z.date().optional(),
    dateTo: z.date().optional(),
    page: z.number().min(1).default(1),
    pageSize: z.number().min(1).max(100).default(20),
  })
  .optional();

export const adminGetLlmLogSchema = z.object({
  id: z.uuid(),
});
