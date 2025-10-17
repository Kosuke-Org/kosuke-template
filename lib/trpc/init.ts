/**
 * tRPC initialization
 * Core tRPC configuration for type-safe API routes
 */

import { initTRPC, TRPCError } from '@trpc/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import superjson from 'superjson';
import { getUserOrgMembership } from '@/lib/organizations';
import { AUTH_ERRORS } from '../auth/constants';

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
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(async (opts) => {
  const { ctx } = opts;

  if (!ctx.userId) {
    throw new TRPCError({
      code: AUTH_ERRORS.UNAUTHORIZED,
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

/**
 * Organization procedure - requires organization context
 * Verifies user is a member of the active organization
 */
export const orgProcedure = protectedProcedure.use(async (opts) => {
  const { ctx } = opts;

  if (!ctx.orgId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Organization context required. Please select an organization.',
    });
  }

  // Verify user is a member of the organization
  const membership = await getUserOrgMembership(ctx.userId, ctx.orgId);

  if (!membership) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You are not a member of this organization',
    });
  }

  return opts.next({
    ctx: {
      ...ctx,
      orgId: ctx.orgId,
      orgRole: ctx.orgRole as string,
      membership,
    },
  });
});

/**
 * Organization admin procedure - requires admin role
 * Only org admins can perform these actions
 */
export const orgAdminProcedure = orgProcedure.use(async (opts) => {
  const { ctx } = opts;

  if (ctx.orgRole !== 'org:admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Organization admin access required',
    });
  }

  return opts.next({
    ctx,
  });
});
