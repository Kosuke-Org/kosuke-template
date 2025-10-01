/**
 * tRPC barrel export
 * Central export point for tRPC utilities
 */

export { trpc } from './client';
export { createCaller } from './server';
export type { AppRouter } from './router';

// Re-export schemas for convenience (client-safe, no server dependencies)
export * from './schemas/tasks';
export * from './schemas/organizations';
