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
});

export const updateTaskSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  completed: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.date().nullable().optional(),
});

export const taskListFiltersSchema = z
  .object({
    completed: z.boolean().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    searchQuery: z.string().optional(),
  })
  .optional();

export const deleteTaskSchema = z.object({
  id: z.number(),
});

export const toggleTaskCompleteSchema = z.object({
  id: z.number(),
});
