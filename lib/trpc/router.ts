/**
 * Main tRPC router
 * Combines all sub-routers
 */

import { router } from './init';
import { tasksRouter } from './routers/tasks';
import { userRouter } from './routers/user';
import { organizationsRouter } from './routers/organizations';
import { billingRouter } from './routers/billing';

export const appRouter = router({
  tasks: tasksRouter,
  user: userRouter,
  organizations: organizationsRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
