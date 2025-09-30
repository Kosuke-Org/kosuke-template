/**
 * Task-related types
 * Types for task management and todo list functionality
 */

import type { Task as TaskSchema } from '@/lib/db/schema';

// Base task types from schema
export type Task = TaskSchema;

// Task priority levels
export type TaskPriority = 'low' | 'medium' | 'high';

// Task filter options
export interface TaskFilters {
  completed?: boolean;
  priority?: TaskPriority;
  searchQuery?: string;
  dueDateBefore?: Date;
  dueDateAfter?: Date;
}

// Create task input
export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: Date;
}

// Update task input
export interface UpdateTaskInput {
  id: number;
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: TaskPriority;
  dueDate?: Date | null;
}

// Task list item (optimized for display)
export interface TaskListItem {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  priority: TaskPriority;
  dueDate: Date | null;
  createdAt: Date;
  isOverdue: boolean;
}
