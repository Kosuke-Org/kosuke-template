/**
 * tRPC initialization
 * Core tRPC configuration for type-safe API routes
 */

import { initTRPC, TRPCError } from '@trpc/server';
import { auth } from '@/lib/auth/providers';
import superjson from 'superjson';

/**
 * Create context for tRPC
 * This runs on every request and provides access to auth state and organization context
 */
export const createTRPCContext = async (opts?: { req?: Request }) => {
  const sessionData = opts?.req ? await auth.api.getSession({ headers: opts.req.headers }) : null;

  const user = sessionData?.user;
  const userId = user?.id ?? null;
  const session = sessionData?.session;

  const activeOrganizationSlug = session?.activeOrganizationSlug ?? null;
  const activeOrganizationId = session?.activeOrganizationId ?? null;
  const orgRole = null; // TODO: Implement org role;

  return {
    userId,
    activeOrganizationId, // Active organization ID (can be null)
    orgRole, // User's role in active organization (can be null)
    activeOrganizationSlug,
    async getUser() {
      return user;
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
 * Public procedure - does not require authentication
 */
export const publicProcedure = t.procedure;

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
      activeOrganizationId: ctx.activeOrganizationId,
      orgRole: ctx.orgRole,
      activeOrganizationSlug: ctx.activeOrganizationSlug,
      getUser: ctx.getUser,
    },
  });
});
