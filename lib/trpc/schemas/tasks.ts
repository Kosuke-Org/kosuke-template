/**
 * Shared Zod schemas for task validation
 * These schemas are used by both tRPC router (server) and forms (client)
 * NO SERVER DEPENDENCIES - can be imported in client components
 */
import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.date().optional(),
  organizationId: z.uuid().optional(),
});

export const updateTaskSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  completed: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.date().nullable().optional(),
  organizationId: z.uuid().nullable().optional(),
});

export const taskListFiltersSchema = z
  .object({
    completed: z.boolean().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    searchQuery: z.string().optional(),
    organizationId: z.uuid().nullable().optional(), // Can filter by org or null (personal)
  })
  .optional();

export const deleteTaskSchema = z.object({
  id: z.uuid(),
});
