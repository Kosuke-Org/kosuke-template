/**
 * tRPC server-side configuration
 * Used in server components and API routes
 */
import { type Context, createTRPCContext } from './init';
import { appRouter } from './router';

/**
 * Create a server-side caller for tRPC
 * Can be used in server components and API routes
 *
 * @param context - Optional context for testing. If not provided, creates context from current request.
 */
export const createCaller = async (context?: Context) => {
  const ctx = context ?? (await createTRPCContext());
  return appRouter.createCaller(ctx);
};
