/**
 * Admin tRPC Router
 * Super admin only - all procedures require super admin permission
 *
 * This router wraps Better Auth's admin plugin functionality in tRPC procedures.
 * User and session management operations are delegated to Better Auth's admin API.
 *
 * See: https://www.better-auth.com/docs/plugins/admin
 */
import { headers } from 'next/headers';

import { TRPCError } from '@trpc/server';
import type { Job } from 'bullmq';
import { and, count, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import { auth } from '@/lib/auth/providers';
import { db } from '@/lib/db/drizzle';
import { orgMemberships, organizations, users } from '@/lib/db/schema';
import { createQueue } from '@/lib/queue/client';
import { QUEUE_NAMES } from '@/lib/queue/config';
import { ORG_ROLES } from '@/lib/types/organization';

import { router, superAdminProcedure } from '../init';
import {
  adminCleanQueueSchema,
  adminCreateMembershipSchema,
  adminCreateOrgSchema,
  adminCreateUserSchema,
  adminDeleteMembershipSchema,
  adminDeleteOrgSchema,
  adminDeleteUserSchema,
  adminJobListFiltersSchema,
  adminMembershipListFiltersSchema,
  adminOrgListFiltersSchema,
  adminPauseQueueSchema,
  adminRemoveJobSchema,
  adminResumeQueueSchema,
  adminRetryJobSchema,
  adminUpdateMembershipSchema,
  adminUpdateOrgSchema,
  adminUpdateUserSchema,
  adminUserListFiltersSchema,
} from '../schemas/admin';

export const adminRouter = router({
  // ============================================================
  // USER MANAGEMENT
  // ============================================================

  users: router({
    /**
     * List all users with filters and pagination
     * Uses Better Auth's admin.listUsers API
     */
    list: superAdminProcedure.input(adminUserListFiltersSchema).query(async ({ input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 10;
      const offset = (page - 1) * pageSize;

      try {
        const result = await auth.api.listUsers({
          query: {
            limit: pageSize,
            offset,
            sortBy: 'createdAt',
            sortDirection: 'desc',
            ...(input?.searchQuery && {
              searchValue: input.searchQuery,
              searchField: 'email',
              searchOperator: 'contains',
            }),
          },
          headers: await headers(),
        });

        return {
          users: result.users.map((user) => ({
            ...user,
            displayName: user.name,
          })),
          total: result.total,
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize),
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list users',
          cause: error,
        });
      }
    }),

    /**
     * Get single user details
     */
    get: superAdminProcedure.input(z.object({ id: z.uuid() })).query(async ({ input }) => {
      const user = await auth.api.getUser({
        query: {
          id: input.id,
        },
        headers: await headers(),
      });

      const [userRole] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      return {
        user: {
          ...user,
          displayName: user.name, // returned mapped custom fields
          role: userRole?.role,
        },
      };
    }),

    /**
     * Create new user (with optional organization membership)
     *
     * Note: Better Auth's admin.createUser doesn't support passwordless authentication yet.
     * See: https://github.com/better-auth/better-auth/issues/4226
     * For now, we create users directly in the database
     */
    create: superAdminProcedure.input(adminCreateUserSchema).mutation(async ({ input }) => {
      const { email, organizationId, orgRole, role } = input;

      // Check if user already exists
      const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (existingUser) {
        throw new TRPCError({ code: 'CONFLICT', message: 'User with this email already exists' });
      }

      const [newUser] = await db
        .insert(users)
        .values({
          email,
          displayName: email,
          emailVerified: false,
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // If organization specified, create membership
      if (organizationId && orgRole) {
        // Verify organization exists
        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, organizationId))
          .limit(1);

        if (!org) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
        }

        // Create membership
        await db.insert(orgMemberships).values({
          organizationId,
          userId: newUser.id,
          role: orgRole,
          createdAt: new Date(),
        });
      }

      return newUser;
    }),

    /**
     * Update user details
     * Uses Better Auth's admin.updateUser API
     */
    update: superAdminProcedure.input(adminUpdateUserSchema).mutation(async ({ input }) => {
      const { id, ...updates } = input;

      await auth.api.adminUpdateUser({
        body: {
          userId: id,
          data: { ...updates },
        },
        headers: await headers(),
      });

      // Revoke user sessions if role or email verified is updated
      if (updates.role || updates.emailVerified) {
        await auth.api.revokeUserSessions({
          body: {
            userId: id,
          },
          headers: await headers(),
        });
      }

      return { success: true, message: 'User updated successfully' };
    }),

    /**
     * Hard deletes a user from the database.
     * Uses Better Auth's admin.removeUser API which properly handles session cleanup
     */
    delete: superAdminProcedure.input(adminDeleteUserSchema).mutation(async ({ input }) => {
      const { id: userId } = input;

      await auth.api.revokeUserSessions({
        body: {
          userId,
        },
        headers: await headers(),
      });

      await auth.api.removeUser({
        body: {
          userId,
        },
        headers: await headers(),
      });
    }),
  }),

  // ============================================================
  // ORGANIZATION MANAGEMENT
  // ============================================================

  organizations: router({
    /**
     * List all organizations with filters and pagination
     */
    list: superAdminProcedure.input(adminOrgListFiltersSchema).query(async ({ input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 10;
      const offset = (page - 1) * pageSize;

      const conditions = [];

      // Search by name
      if (input?.searchQuery && input.searchQuery.trim()) {
        const searchTerm = `%${input.searchQuery.trim()}%`;
        conditions.push(or(ilike(organizations.name, searchTerm))!);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [{ total }] = await db
        .select({ total: count() })
        .from(organizations)
        .where(whereClause);

      // Get paginated organizations with member count
      const orgList = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          logo: organizations.logo,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
          memberCount: sql<number>`count(${orgMemberships.id})::int`,
        })
        .from(organizations)
        .leftJoin(orgMemberships, eq(organizations.id, orgMemberships.organizationId))
        .where(whereClause)
        .groupBy(organizations.id)
        .orderBy(sql`${organizations.createdAt} DESC`)
        .limit(pageSize)
        .offset(offset);

      return {
        organizations: orgList,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

    /**
     * Get single organization details with members
     */
    get: superAdminProcedure.input(z.object({ id: z.uuid() })).query(async ({ input }) => {
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, input.id))
        .limit(1);

      if (!org) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      }

      // Get members with user details
      const members = await db
        .select({
          id: orgMemberships.id,
          role: orgMemberships.role,
          createdAt: orgMemberships.createdAt,
          user: {
            id: users.id,
            email: users.email,
            displayName: users.displayName,
            profileImageUrl: users.profileImageUrl,
          },
        })
        .from(orgMemberships)
        .innerJoin(users, eq(orgMemberships.userId, users.id))
        .where(eq(orgMemberships.organizationId, org.id));

      return {
        organization: org,
        members,
      };
    }),

    /**
     * Create new organization (with optional owner)
     */
    create: superAdminProcedure.input(adminCreateOrgSchema).mutation(async ({ input }) => {
      const { name, slug, ownerId } = input;

      // Check if slug already exists
      const [existingOrg] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, slug))
        .limit(1);

      if (existingOrg) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Organization with this slug already exists',
        });
      }

      // Create the organization
      const [newOrg] = await db
        .insert(organizations)
        .values({
          name,
          slug,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // If owner specified, create owner membership
      if (ownerId) {
        // Verify user exists
        const [owner] = await db.select().from(users).where(eq(users.id, ownerId)).limit(1);

        if (!owner) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Owner user not found' });
        }

        // Create owner membership
        await db.insert(orgMemberships).values({
          organizationId: newOrg.id,
          userId: ownerId,
          role: ORG_ROLES.OWNER,
          createdAt: new Date(),
        });
      }

      return newOrg;
    }),

    /**
     * Update organization details
     */
    update: superAdminProcedure.input(adminUpdateOrgSchema).mutation(async ({ input }) => {
      const { id, ...updates } = input;

      try {
        await db
          .update(organizations)
          .set({
            ...updates,
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, id));
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update organization',
          cause: error,
        });
      }
    }),

    /**
     * Delete organization (cascades to memberships, invitations, orders, tasks, etc.)
     */
    delete: superAdminProcedure.input(adminDeleteOrgSchema).mutation(async ({ input }) => {
      try {
        await db.delete(organizations).where(eq(organizations.id, input.id));
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete organization',
          cause: error,
        });
      }
    }),
  }),

  // ============================================================
  // MEMBERSHIP MANAGEMENT
  // ============================================================

  memberships: router({
    /**
     * List all memberships with filters and pagination
     */
    list: superAdminProcedure.input(adminMembershipListFiltersSchema).query(async ({ input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 10;
      const offset = (page - 1) * pageSize;

      const conditions = [];

      // Filter by organization
      if (input?.organizationId) {
        conditions.push(eq(orgMemberships.organizationId, input.organizationId));
      }

      // Filter by user
      if (input?.userId) {
        conditions.push(eq(orgMemberships.userId, input.userId));
      }

      // Filter by role
      if (input?.role) {
        conditions.push(eq(orgMemberships.role, input.role));
      }

      // Search by user email/name or org name
      if (input?.searchQuery && input.searchQuery.trim()) {
        const searchTerm = `%${input.searchQuery.trim()}%`;
        conditions.push(
          or(
            ilike(users.email, searchTerm),
            ilike(users.displayName, searchTerm),
            ilike(organizations.name, searchTerm)
          )!
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [{ total }] = await db
        .select({ total: count() })
        .from(orgMemberships)
        .innerJoin(users, eq(orgMemberships.userId, users.id))
        .innerJoin(organizations, eq(orgMemberships.organizationId, organizations.id))
        .where(whereClause);

      // Get paginated memberships
      const membershipList = await db
        .select({
          id: orgMemberships.id,
          role: orgMemberships.role,
          createdAt: orgMemberships.createdAt,
          user: {
            id: users.id,
            email: users.email,
            displayName: users.displayName,
            profileImageUrl: users.profileImageUrl,
          },
          organization: {
            id: organizations.id,
            name: organizations.name,
            slug: organizations.slug,
          },
        })
        .from(orgMemberships)
        .innerJoin(users, eq(orgMemberships.userId, users.id))
        .innerJoin(organizations, eq(orgMemberships.organizationId, organizations.id))
        .where(whereClause)
        .orderBy(sql`${orgMemberships.createdAt} DESC`)
        .limit(pageSize)
        .offset(offset);

      return {
        memberships: membershipList,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

    /**
     * Create new membership
     */
    create: superAdminProcedure.input(adminCreateMembershipSchema).mutation(async ({ input }) => {
      // Verify user exists
      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      // Verify organization exists
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, input.organizationId))
        .limit(1);
      if (!org) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      }

      // Check if membership already exists
      const [existing] = await db
        .select()
        .from(orgMemberships)
        .where(
          and(
            eq(orgMemberships.organizationId, input.organizationId),
            eq(orgMemberships.userId, input.userId)
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Membership already exists' });
      }

      const [created] = await db
        .insert(orgMemberships)
        .values({
          organizationId: input.organizationId,
          userId: input.userId,
          role: input.role,
          createdAt: new Date(),
        })
        .returning();

      return created;
    }),

    /**
     * Update membership role
     */
    update: superAdminProcedure.input(adminUpdateMembershipSchema).mutation(async ({ input }) => {
      // Get the membership being updated
      const [membership] = await db
        .select()
        .from(orgMemberships)
        .where(eq(orgMemberships.id, input.id))
        .limit(1);

      if (!membership) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Membership not found' });
      }

      // If changing role FROM owner, ensure there will be another owner
      if (membership.role === ORG_ROLES.OWNER && input.role !== ORG_ROLES.OWNER) {
        const [ownerCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(orgMemberships)
          .where(
            and(
              eq(orgMemberships.organizationId, membership.organizationId),
              eq(orgMemberships.role, ORG_ROLES.OWNER)
            )
          );

        if (ownerCount.count <= 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot change role: organization must have at least one owner',
          });
        }
      }

      const [updated] = await db
        .update(orgMemberships)
        .set({ role: input.role })
        .where(eq(orgMemberships.id, input.id))
        .returning();

      return updated;
    }),

    /**
     * Delete membership
     */
    delete: superAdminProcedure.input(adminDeleteMembershipSchema).mutation(async ({ input }) => {
      // Get the membership being deleted
      const [membership] = await db
        .select()
        .from(orgMemberships)
        .where(eq(orgMemberships.id, input.id))
        .limit(1);

      if (!membership) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Membership not found' });
      }

      // If deleting an owner, ensure there will be another owner
      if (membership.role === ORG_ROLES.OWNER) {
        const [ownerCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(orgMemberships)
          .where(
            and(
              eq(orgMemberships.organizationId, membership.organizationId),
              eq(orgMemberships.role, ORG_ROLES.OWNER)
            )
          );

        if (ownerCount.count <= 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'Cannot remove member: organization must have at least one owner. Transfer ownership to another member first.',
          });
        }
      }

      const [deleted] = await db
        .delete(orgMemberships)
        .where(eq(orgMemberships.id, input.id))
        .returning();

      return { success: true, deletedMembership: deleted };
    }),
  }),

  // ============================================================
  // JOBS & QUEUE MANAGEMENT
  // ============================================================

  jobs: router({
    /**
     * List all available queues
     */
    listQueues: superAdminProcedure.query(async () => {
      const queueNames = Object.values(QUEUE_NAMES);

      const queuesData = await Promise.all(
        queueNames.map(async (queueName) => {
          const queue = createQueue(queueName);

          const [waitingCount, activeCount, completedCount, failedCount, delayedCount, isPaused] =
            await Promise.all([
              queue.getWaitingCount(),
              queue.getActiveCount(),
              queue.getCompletedCount(),
              queue.getFailedCount(),
              queue.getDelayedCount(),
              queue.isPaused(),
            ]);

          return {
            name: queueName,
            counts: {
              waiting: waitingCount,
              active: activeCount,
              completed: completedCount,
              failed: failedCount,
              delayed: delayedCount,
            },
            isPaused,
          };
        })
      );

      return queuesData;
    }),

    /**
     * List jobs with pagination and filters
     */
    listJobs: superAdminProcedure.input(adminJobListFiltersSchema).query(async ({ input }) => {
      const queueName = input?.queueName ?? QUEUE_NAMES.SUBSCRIPTIONS;
      const status = input?.status ?? 'failed';
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;

      const queue = createQueue(queueName);

      // Get jobs based on status
      let jobs: Job[] = [];
      switch (status) {
        case 'completed':
          jobs = await queue.getCompleted(0, (page - 1) * pageSize + pageSize - 1);
          break;
        case 'failed':
          jobs = await queue.getFailed(0, (page - 1) * pageSize + pageSize - 1);
          break;
        case 'active':
          jobs = await queue.getActive(0, (page - 1) * pageSize + pageSize - 1);
          break;
        case 'waiting':
          jobs = await queue.getWaiting(0, (page - 1) * pageSize + pageSize - 1);
          break;
        case 'delayed':
          jobs = await queue.getDelayed(0, (page - 1) * pageSize + pageSize - 1);
          break;
        default:
          jobs = [];
      }

      // Slice for actual page
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedJobs = jobs.slice(startIndex, endIndex);

      // Get total count
      let total = 0;
      switch (status) {
        case 'completed':
          total = await queue.getCompletedCount();
          break;
        case 'failed':
          total = await queue.getFailedCount();
          break;
        case 'active':
          total = await queue.getActiveCount();
          break;
        case 'waiting':
          total = await queue.getWaitingCount();
          break;
        case 'delayed':
          total = await queue.getDelayedCount();
          break;
      }

      const jobsData = paginatedJobs.map((job) => ({
        id: job.id ?? 'unknown',
        name: job.name,
        data: job.data,
        progress: job.progress ?? 0,
        attemptsMade: job.attemptsMade,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        timestamp: job.timestamp,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace,
        returnvalue: job.returnvalue,
      }));

      return {
        jobs: jobsData,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        queueName,
        status,
      };
    }),

    /**
     * Get single job details
     */
    getJob: superAdminProcedure
      .input(
        z.object({
          queueName: z.string(),
          jobId: z.string(),
        })
      )
      .query(async ({ input }) => {
        const queue = createQueue(input.queueName);
        const job = await queue.getJob(input.jobId);

        if (!job) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
        }

        return {
          id: job.id,
          name: job.name,
          data: job.data,
          progress: job.progress,
          attemptsMade: job.attemptsMade,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          timestamp: job.timestamp,
          failedReason: job.failedReason,
          stacktrace: job.stacktrace,
          returnvalue: job.returnvalue,
          opts: job.opts,
        };
      }),

    /**
     * Retry a failed job
     */
    retryJob: superAdminProcedure.input(adminRetryJobSchema).mutation(async ({ input }) => {
      const queue = createQueue(input.queueName);
      const job = await queue.getJob(input.jobId);

      if (!job) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
      }

      await job.retry();

      return { success: true, jobId: input.jobId };
    }),

    /**
     * Remove a job
     */
    removeJob: superAdminProcedure.input(adminRemoveJobSchema).mutation(async ({ input }) => {
      const queue = createQueue(input.queueName);
      const job = await queue.getJob(input.jobId);

      if (!job) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
      }

      await job.remove();

      return { success: true, jobId: input.jobId };
    }),

    /**
     * Clean queue (remove old jobs)
     */
    cleanQueue: superAdminProcedure.input(adminCleanQueueSchema).mutation(async ({ input }) => {
      const queue = createQueue(input.queueName);

      await queue.clean(input.grace, input.limit ?? 1000, input.status);

      return { success: true, queueName: input.queueName };
    }),

    /**
     * Pause queue
     */
    pauseQueue: superAdminProcedure.input(adminPauseQueueSchema).mutation(async ({ input }) => {
      const queue = createQueue(input.queueName);

      await queue.pause();

      return { success: true, queueName: input.queueName, paused: true };
    }),

    /**
     * Resume queue
     */
    resumeQueue: superAdminProcedure.input(adminResumeQueueSchema).mutation(async ({ input }) => {
      const queue = createQueue(input.queueName);

      await queue.resume();

      return { success: true, queueName: input.queueName, paused: false };
    }),

    /**
     * Drain queue (remove all waiting jobs)
     */
    drainQueue: superAdminProcedure
      .input(z.object({ queueName: z.string() }))
      .mutation(async ({ input }) => {
        const queue = createQueue(input.queueName);

        await queue.drain();

        return { success: true, queueName: input.queueName };
      }),

    /**
     * Obliterate queue (remove everything)
     */
    obliterateQueue: superAdminProcedure
      .input(z.object({ queueName: z.string() }))
      .mutation(async ({ input }) => {
        const queue = createQueue(input.queueName);

        await queue.obliterate({ force: true });

        return { success: true, queueName: input.queueName };
      }),
  }),
});
