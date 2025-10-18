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
export type { TaskPriority } from '@/lib/db/schema';
