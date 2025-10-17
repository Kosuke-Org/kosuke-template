/**
 * tRPC server-side configuration
 * Used in server components and API routes
 */

import { httpBatchLink } from '@trpc/client';
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

/**
 * Get absolute URL for API endpoint
 */
const getBaseUrl = () => {
  if (typeof window !== 'undefined') return '';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
};

/**
 * Create tRPC client for server-side use
 */
export const createTRPCClient = () => {
  return {
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
      }),
    ],
  };
};
