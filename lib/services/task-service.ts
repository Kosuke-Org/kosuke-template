/**
 * Service layer for task operations
 * Handles all business logic and database operations for tasks
 */
import { and, desc, eq, ilike, isNull, or } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import type { NewTask, Organization, Task, User } from '@/lib/db/schema';
import { tasks } from '@/lib/db/schema';

import { ERRORS } from './constants';

/**
 * Filters for task list queries
 */
export interface TaskListFilters {
  userId: User['id'];
  organizationId?: Organization['id'] | null;
  completed?: boolean;
  priority?: Task['priority'];
  searchQuery?: string;
}

/**
 * Get all tasks for a user with optional filtering
 * Supports both personal tasks and org-scoped tasks
 */
export async function listTasks(filters: TaskListFilters) {
  const conditions = [eq(tasks.userId, filters.userId)];

  // Filter by organization (or personal tasks if null)
  if (filters.organizationId !== undefined) {
    if (filters.organizationId === null) {
      // Personal tasks only (no org)
      conditions.push(isNull(tasks.organizationId));
    } else {
      // Org-specific tasks
      conditions.push(eq(tasks.organizationId, filters.organizationId));
    }
  }

  // Filter by completion status
  if (filters.completed !== undefined) {
    conditions.push(eq(tasks.completed, filters.completed ? 'true' : 'false'));
  }

  // Filter by priority
  if (filters.priority) {
    conditions.push(eq(tasks.priority, filters.priority));
  }

  // Server-side search by title or description
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const searchTerm = `%${filters.searchQuery.trim()}%`;
    conditions.push(or(ilike(tasks.title, searchTerm), ilike(tasks.description, searchTerm))!);
  }

  const userTasks = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(desc(tasks.createdAt));

  // Transform to proper types with computed properties
  return userTasks.map((task) => ({
    ...task,
    completed: task.completed === 'true',
    isOverdue:
      task.dueDate && task.completed === 'false' ? new Date(task.dueDate) < new Date() : false,
  }));
}

/**
 * Create a new task (supports personal and org-scoped tasks)
 */
export async function createTask(data: NewTask) {
  const [task] = await db
    .insert(tasks)
    .values({
      userId: data.userId,
      organizationId: data.organizationId ?? null,
      title: data.title,
      description: data.description ?? null,
      priority: data.priority ?? 'medium',
      dueDate: data.dueDate ?? null,
      completed: 'false',
    })
    .returning();

  if (!task) {
    throw new Error('Failed to create task', { cause: ERRORS.INTERNAL_SERVER_ERROR });
  }

  // Match the same structure as listTasks
  return {
    ...task,
    completed: task.completed === 'true',
    isOverdue:
      task.dueDate && task.completed === 'false' ? new Date(task.dueDate) < new Date() : false,
  };
}

/**
 * Update an existing task
 * Only the task owner can update it
 */
export async function updateTask(data: {
  id: Task['id'];
  userId: User['id'];
  title?: Task['title'];
  description?: Task['description'];
  completed?: Task['completed'];
  priority?: Task['priority'];
  dueDate?: Task['dueDate'];
  organizationId?: Organization['id'] | null;
}) {
  // Verify task belongs to user
  const existingTask = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, data.id), eq(tasks.userId, data.userId)))
    .limit(1);

  if (existingTask.length === 0) {
    throw new Error('Task not found or you do not have permission to update it', {
      cause: ERRORS.NOT_FOUND,
    });
  }

  const updateData: Partial<NewTask> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.completed !== undefined) updateData.completed = data.completed;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
  if (data.organizationId !== undefined) updateData.organizationId = data.organizationId;

  const [updatedTask] = await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, data.id))
    .returning();

  if (!updatedTask) {
    throw new Error('Failed to update task', { cause: ERRORS.INTERNAL_SERVER_ERROR });
  }

  // Match the same structure as listTasks
  return {
    ...updatedTask,
    completed: updatedTask.completed === 'true',
    isOverdue:
      updatedTask.dueDate && updatedTask.completed === 'false'
        ? new Date(updatedTask.dueDate) < new Date()
        : false,
  };
}

/**
 * Delete a task
 * Only the task owner can delete it
 */
export async function deleteTask(params: { id: Task['id']; userId: User['id'] }) {
  // Verify task belongs to user
  const existingTask = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, params.id), eq(tasks.userId, params.userId)))
    .limit(1);

  if (existingTask.length === 0) {
    throw new Error('Task not found or you do not have permission to delete it', {
      cause: ERRORS.NOT_FOUND,
    });
  }

  await db.delete(tasks).where(eq(tasks.id, params.id));

  return { success: true };
}
