/**
 * tRPC router for task operations
 * Handles CRUD operations for the todo list
 */

import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { tasks } from '@/lib/db/schema';
import { router, protectedProcedure } from '../init';
import { TRPCError } from '@trpc/server';

export const tasksRouter = router({
  /**
   * Get all tasks for the authenticated user
   */
  list: protectedProcedure
    .input(
      z
        .object({
          completed: z.boolean().optional(),
          priority: z.enum(['low', 'medium', 'high']).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(tasks.clerkUserId, ctx.userId)];

      if (input?.completed !== undefined) {
        conditions.push(eq(tasks.completed, input.completed ? 'true' : 'false'));
      }

      if (input?.priority) {
        conditions.push(eq(tasks.priority, input.priority));
      }

      const userTasks = await db
        .select()
        .from(tasks)
        .where(and(...conditions))
        .orderBy(desc(tasks.createdAt));

      // Transform to proper types
      return userTasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        completed: task.completed === 'true',
        priority: task.priority as 'low' | 'medium' | 'high',
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        isOverdue:
          task.dueDate && task.completed === 'false' ? new Date(task.dueDate) < new Date() : false,
      }));
    }),

  /**
   * Get task statistics
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const userTasks = await db.select().from(tasks).where(eq(tasks.clerkUserId, ctx.userId));

    const total = userTasks.length;
    const completed = userTasks.filter((t) => t.completed === 'true').length;
    const pending = total - completed;
    const now = new Date();
    const overdue = userTasks.filter(
      (t) => t.completed === 'false' && t.dueDate && new Date(t.dueDate) < now
    ).length;

    const byPriority = {
      low: userTasks.filter((t) => t.priority === 'low').length,
      medium: userTasks.filter((t) => t.priority === 'medium').length,
      high: userTasks.filter((t) => t.priority === 'high').length,
    };

    return {
      total,
      completed,
      pending,
      overdue,
      byPriority,
    };
  }),

  /**
   * Create a new task
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, 'Title is required').max(255),
        description: z.string().optional(),
        priority: z.enum(['low', 'medium', 'high']).default('medium'),
        dueDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [task] = await db
        .insert(tasks)
        .values({
          clerkUserId: ctx.userId,
          title: input.title,
          description: input.description ?? null,
          priority: input.priority,
          dueDate: input.dueDate ?? null,
          completed: 'false',
        })
        .returning();

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        completed: task.completed === 'true',
        priority: task.priority as 'low' | 'medium' | 'high',
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };
    }),

  /**
   * Update an existing task
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().nullable().optional(),
        completed: z.boolean().optional(),
        priority: z.enum(['low', 'medium', 'high']).optional(),
        dueDate: z.date().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify task belongs to user
      const existingTask = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, input.id), eq(tasks.clerkUserId, ctx.userId)))
        .limit(1);

      if (existingTask.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.completed !== undefined) updateData.completed = input.completed ? 'true' : 'false';
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;

      const [updatedTask] = await db
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, input.id))
        .returning();

      return {
        id: updatedTask.id,
        title: updatedTask.title,
        description: updatedTask.description,
        completed: updatedTask.completed === 'true',
        priority: updatedTask.priority as 'low' | 'medium' | 'high',
        dueDate: updatedTask.dueDate,
        createdAt: updatedTask.createdAt,
        updatedAt: updatedTask.updatedAt,
      };
    }),

  /**
   * Delete a task
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify task belongs to user
      const existingTask = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, input.id), eq(tasks.clerkUserId, ctx.userId)))
        .limit(1);

      if (existingTask.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      await db.delete(tasks).where(eq(tasks.id, input.id));

      return { success: true };
    }),

  /**
   * Toggle task completion status
   */
  toggleComplete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get current task
      const existingTask = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, input.id), eq(tasks.clerkUserId, ctx.userId)))
        .limit(1);

      if (existingTask.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      const currentCompleted = existingTask[0].completed === 'true';

      const [updatedTask] = await db
        .update(tasks)
        .set({
          completed: currentCompleted ? 'false' : 'true',
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, input.id))
        .returning();

      return {
        id: updatedTask.id,
        completed: updatedTask.completed === 'true',
      };
    }),
});
