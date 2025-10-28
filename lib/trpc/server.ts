/**
 * tRPC server-side configuration
 * Used in server components and API routes
 */

import { appRouter } from './router';
import { createTRPCContext, type Context } from './init';

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
