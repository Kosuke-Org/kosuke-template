/**
 * Main tRPC router
 * Combines all sub-routers
 */

import { router } from './init';
import { tasksRouter } from './routers/tasks';
import { userRouter } from './routers/user';

export const appRouter = router({
  tasks: tasksRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
