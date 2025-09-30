/**
 * Main tRPC router
 * Combines all sub-routers
 */

import { router } from './init';
import { tasksRouter } from './routers/tasks';

export const appRouter = router({
  tasks: tasksRouter,
});

export type AppRouter = typeof appRouter;
