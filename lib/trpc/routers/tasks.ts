/**
 * tRPC router for task operations
 * Thin validation layer that delegates to task service
 */
import * as taskService from '@/lib/services/task-service';
import { protectedProcedure, router } from '@/lib/trpc/init';
import {
  createTaskSchema,
  deleteTaskSchema,
  taskListFiltersSchema,
  updateTaskSchema,
} from '@/lib/trpc/schemas/tasks';
import { handleApiError } from '@/lib/utils';

export const tasksRouter = router({
  /**
   * Get all tasks for the authenticated user with server-side filtering
   * Supports both personal tasks and org-scoped tasks
   */
  list: protectedProcedure.input(taskListFiltersSchema).query(async ({ ctx, input }) => {
    try {
      return await taskService.listTasks({
        userId: ctx.userId,
        organizationId: input?.organizationId,
        completed: input?.completed,
        priority: input?.priority,
        searchQuery: input?.searchQuery,
      });
    } catch (error) {
      handleApiError(error);
    }
  }),

  /**
   * Create a new task (supports personal and org-scoped tasks)
   */
  create: protectedProcedure.input(createTaskSchema).mutation(async ({ ctx, input }) => {
    try {
      return await taskService.createTask({
        userId: ctx.userId,
        organizationId: input.organizationId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueDate: input.dueDate,
      });
    } catch (error) {
      handleApiError(error);
    }
  }),

  /**
   * Update an existing task
   */
  update: protectedProcedure.input(updateTaskSchema).mutation(async ({ ctx, input }) => {
    try {
      return await taskService.updateTask({
        id: input.id,
        userId: ctx.userId,
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.completed !== undefined && {
          completed: input.completed ? 'true' : 'false',
        }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
        ...(input.organizationId !== undefined && { organizationId: input.organizationId }),
      });
    } catch (error) {
      handleApiError(error);
    }
  }),

  /**
   * Delete a task
   */
  delete: protectedProcedure.input(deleteTaskSchema).mutation(async ({ ctx, input }) => {
    try {
      return await taskService.deleteTask({
        id: input.id,
        userId: ctx.userId,
      });
    } catch (error) {
      handleApiError(error);
    }
  }),
});
