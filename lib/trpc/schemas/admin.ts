import { z } from 'zod';

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
});

export const adminDeleteUserSchema = z.object({
  id: z.uuid(),
});

export const adminCreateUserSchema = z.object({
  email: z.email('Invalid email address'),
  organizationId: z.uuid().optional(),
  role: z.enum(['owner', 'admin', 'member']).optional().default('member'),
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
  ownerId: z.uuid().optional(),
});

// Organization Membership Schemas
export const adminMembershipListFiltersSchema = z
  .object({
    searchQuery: z.string().optional(),
    organizationId: z.uuid().optional(),
    userId: z.uuid().optional(),
    role: z.enum(['owner', 'admin', 'member']).optional(),
    page: z.number().min(1).default(1),
    pageSize: z.number().min(5).max(100).default(10),
  })
  .optional();

export const adminUpdateMembershipSchema = z.object({
  id: z.uuid(),
  role: z.enum(['owner', 'admin', 'member']),
});

export const adminDeleteMembershipSchema = z.object({
  id: z.uuid(),
});

export const adminCreateMembershipSchema = z.object({
  organizationId: z.uuid(),
  userId: z.uuid(),
  role: z.enum(['owner', 'admin', 'member']),
});

// Job & Queue Management Schemas
export const adminJobListFiltersSchema = z
  .object({
    queueName: z.string().optional(),
    status: z.enum(['completed', 'failed', 'active', 'waiting', 'delayed']).optional(),
    page: z.number().min(1).default(1),
    pageSize: z.number().min(5).max(100).default(20),
  })
  .optional();

export const adminRetryJobSchema = z.object({
  queueName: z.string(),
  jobId: z.string(),
});

export const adminRemoveJobSchema = z.object({
  queueName: z.string(),
  jobId: z.string(),
});

export const adminCleanQueueSchema = z.object({
  queueName: z.string(),
  grace: z.number().min(0).default(0), // milliseconds
  status: z.enum(['completed', 'failed', 'delayed', 'wait']),
  limit: z.number().min(1).max(10000).optional(),
});

export const adminPauseQueueSchema = z.object({
  queueName: z.string(),
});

export const adminResumeQueueSchema = z.object({
  queueName: z.string(),
});
