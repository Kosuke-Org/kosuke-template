/**
 * Task-related types
 *
 * Type Strategy:
 * - Base types: Use Drizzle schema directly (import from '@/lib/db/schema')
 * - Input/Output types: Infer from tRPC router (use inferRouterInputs/Outputs)
 * - Domain-specific types: Define here (computed fields, UI concerns, complex compositions)
 *
 * @see lib/trpc/routers/tasks.ts for tRPC procedure types
 */

// Re-export types from schema - all task types come from the database schema
export type { Task, TaskPriority, NewTask } from '@/lib/db/schema';

/**
 * Extended Task Types
 * Types that extend base schema types with organization/team context
 */

/**
 * Task with organization and team information
 * Used when displaying tasks in organization context
 */
export interface TaskWithOrg {
  id: number;
  clerkUserId: string;
  organizationId: string | null;
  teamId: string | null;
  title: string;
  description: string | null;
  completed: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  organization?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  team?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  creator: {
    clerkUserId: string;
    email: string;
    displayName: string | null;
    profileImageUrl: string | null;
  };
}

/**
 * Task with full details including creator and assignees
 * Used for detailed task views
 */
export interface TaskWithDetails extends TaskWithOrg {
  isOverdue: boolean;
  daysUntilDue?: number;
  completionPercentage?: number;
}

/**
 * Task statistics for a collection of tasks
 */
export interface TaskStatistics {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
  };
}

/**
 * Task filters for querying tasks
 * This will be used in tRPC schemas
 */
export interface TaskFilters {
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  organizationId?: string;
  teamId?: string;
  searchQuery?: string;
  dueDateBefore?: Date;
  dueDateAfter?: Date;
}

/**
 * Task grouping options
 */
export type TaskGroupBy = 'team' | 'priority' | 'status' | 'dueDate' | 'creator';

/**
 * Grouped tasks by a specific field
 */
export interface GroupedTasks<T extends TaskGroupBy> {
  groupBy: T;
  groups: Array<{
    key: string;
    label: string;
    tasks: TaskWithOrg[];
    count: number;
  }>;
}

/**
 * Helper functions for task operations
 */
export function isTaskOverdue(task: Pick<TaskWithOrg, 'dueDate' | 'completed'>): boolean {
  if (!task.dueDate || task.completed === 'true') return false;
  return new Date(task.dueDate) < new Date();
}

export function getTaskCompletionStatus(task: Pick<TaskWithOrg, 'completed'>): boolean {
  return task.completed === 'true';
}

export function getDaysUntilDue(task: Pick<TaskWithOrg, 'dueDate'>): number | null {
  if (!task.dueDate) return null;
  const now = new Date();
  const due = new Date(task.dueDate);
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
