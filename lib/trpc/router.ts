/**
 * Main tRPC router
 * Combines all sub-routers
 */

import { router } from './init';
import { tasksRouter } from './routers/tasks';
import { userRouter } from './routers/user';
import { cmsRouter } from './routers/cms';

export const appRouter = router({
  tasks: tasksRouter,
  user: userRouter,
  cms: cmsRouter,
});

export type AppRouter = typeof appRouter;
