/**
 * tRPC initialization
 * Core tRPC configuration for type-safe API routes
 */
import { headers } from 'next/headers';

import { TRPCError, initTRPC } from '@trpc/server';
import superjson from 'superjson';

import { auth } from '@/lib/auth/providers';
import { USER_ROLES } from '@/lib/types/organization';

/**
 * Create context for tRPC
 * This runs on every request and provides access to auth state and organization context
 *
 * @param opts - Optional context options
 * @param opts.req - Request object (used in API routes)
 * If no req is provided, uses headers() from next/headers (for server components)
 */
export const createTRPCContext = async (opts?: { req?: Request }) => {
  let sessionData = null;

  if (opts?.req) {
    // API route - use request headers
    // Disable cookie cache to ensure we always get fresh session data from Redis/DB
    sessionData = await auth.api.getSession({
      headers: opts.req.headers,
      query: { disableCookieCache: true },
    });
  } else {
    // Server component - use headers() from next/headers
    const headersList = await headers();
    // Disable cookie cache to ensure we always get fresh session data from Redis/DB
    sessionData = await auth.api.getSession({
      headers: headersList,
      query: { disableCookieCache: true },
    });
  }

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

/**
 * Super admin procedure - requires authentication and super admin access
 */
export const superAdminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const user = await ctx.getUser();

  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
  }

  if (user.role !== USER_ROLES.ADMIN) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }

  return next({ ctx });
});
