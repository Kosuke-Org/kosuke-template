/**
 * Main tRPC router
 * Combines all sub-routers
 */

import { router } from './init';
import { tasksRouter } from './routers/tasks';
import { userRouter } from './routers/user';
import { organizationsRouter } from './routers/organizations';

export const appRouter = router({
  tasks: tasksRouter,
  user: userRouter,
  organizations: organizationsRouter,
});

export type AppRouter = typeof appRouter;
