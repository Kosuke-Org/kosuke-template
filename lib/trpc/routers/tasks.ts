/**
 * tRPC router for task operations
 * Handles CRUD operations for the todo list with server-side filtering
 */

import { eq, and, desc, or, ilike, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { tasks } from '@/lib/db/schema';
import { router, protectedProcedure } from '../init';
import { TRPCError } from '@trpc/server';
import {
  createTaskSchema,
  updateTaskSchema,
  taskListFiltersSchema,
  deleteTaskSchema,
} from '../schemas/tasks';

export const tasksRouter = router({
  /**
   * Get all tasks for the authenticated user with server-side filtering
   * Supports both personal tasks and org-scoped tasks
   */
  list: protectedProcedure.input(taskListFiltersSchema).query(async ({ ctx, input }) => {
    const conditions = [eq(tasks.clerkUserId, ctx.userId)];

    // Filter by organization (or personal tasks if null)
    if (input?.organizationId !== undefined) {
      if (input.organizationId === null) {
        // Personal tasks only (no org)
        conditions.push(isNull(tasks.organizationId));
      } else {
        // Org-specific tasks
        conditions.push(eq(tasks.organizationId, input.organizationId));
      }
    }

    // Filter by completion status
    if (input?.completed !== undefined) {
      conditions.push(eq(tasks.completed, input.completed ? 'true' : 'false'));
    }

    // Filter by priority
    if (input?.priority) {
      conditions.push(eq(tasks.priority, input.priority));
    }

    // Server-side search by title or description
    if (input?.searchQuery && input.searchQuery.trim()) {
      const searchTerm = `%${input.searchQuery.trim()}%`;
      conditions.push(or(ilike(tasks.title, searchTerm), ilike(tasks.description, searchTerm))!);
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
      priority: task.priority, // Type is now inferred from pgEnum in schema
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      isOverdue:
        task.dueDate && task.completed === 'false' ? new Date(task.dueDate) < new Date() : false,
    }));
  }),

  /**
   * Create a new task (supports personal and org-scoped tasks)
   */
  create: protectedProcedure.input(createTaskSchema).mutation(async ({ ctx, input }) => {
    const [task] = await db
      .insert(tasks)
      .values({
        clerkUserId: ctx.userId,
        organizationId: input.organizationId ?? null,
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
      priority: task.priority, // Type is now inferred from pgEnum in schema
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }),

  /**
   * Update an existing task
   */
  update: protectedProcedure.input(updateTaskSchema).mutation(async ({ ctx, input }) => {
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
    if (input.organizationId !== undefined) updateData.organizationId = input.organizationId;

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
      priority: updatedTask.priority, // Type is now inferred from pgEnum in schema
      dueDate: updatedTask.dueDate,
      createdAt: updatedTask.createdAt,
      updatedAt: updatedTask.updatedAt,
    };
  }),

  /**
   * Delete a task
   */
  delete: protectedProcedure.input(deleteTaskSchema).mutation(async ({ ctx, input }) => {
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
});
