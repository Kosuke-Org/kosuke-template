/**
 * tRPC initialization
 * Core tRPC configuration for type-safe API routes
 */

import { initTRPC, TRPCError } from '@trpc/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import superjson from 'superjson';

/**
 * Create context for tRPC
 * This runs on every request and provides access to auth state and organization context
 */
export const createTRPCContext = async () => {
  const { userId, orgId, orgRole } = await auth();

  return {
    userId,
    orgId, // Active organization ID from Clerk (can be null)
    orgRole, // User's role in active organization (can be null)
    async getUser() {
      return userId ? await currentUser() : null;
    },
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router;

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(async (opts) => {
  const { ctx } = opts;

  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }

  return opts.next({
    ctx: {
      userId: ctx.userId,
      orgId: ctx.orgId,
      orgRole: ctx.orgRole,
      getUser: ctx.getUser,
    },
  });
});
