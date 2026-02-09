/**
 * Main tRPC router
 * Combines all sub-routers
 */
import { router } from './init';
import { adminRouter } from './routers/admin';
import { authRouter } from './routers/auth';
import { billingRouter } from './routers/billing';
import { chatRouter } from './routers/chat';
import { documentsRouter } from './routers/documents';
import { ordersRouter } from './routers/orders';
import { organizationsRouter } from './routers/organizations';
import { tasksRouter } from './routers/tasks';
import { userRouter } from './routers/user';
import { waitlistRouter } from './routers/waitlist';

export const appRouter = router({
  admin: adminRouter,
  auth: authRouter,
  billing: billingRouter,
  chat: chatRouter,
  documents: documentsRouter,
  orders: ordersRouter,
  organizations: organizationsRouter,
  tasks: tasksRouter,
  user: userRouter,
  waitlist: waitlistRouter,
});

export type AppRouter = typeof appRouter;
