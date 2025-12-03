/**
 * Admin tRPC Router
 * Super admin only - all procedures require super admin permission
 */
import { TRPCError } from '@trpc/server';
import type { Job } from 'bullmq';
import { and, count, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db/drizzle';
import { orgMemberships, organizations, userSubscriptions, users } from '@/lib/db/schema';
import { createQueue } from '@/lib/queue/client';
import { QUEUE_NAMES } from '@/lib/queue/config';

import { router, superAdminProcedure } from '../init';
import {
  adminCleanQueueSchema,
  adminCreateMembershipSchema,
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
     */
    list: superAdminProcedure.input(adminUserListFiltersSchema).query(async ({ input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 10;
      const offset = (page - 1) * pageSize;

      const conditions = [];

      // Search by email or display name
      if (input?.searchQuery && input.searchQuery.trim()) {
        const searchTerm = `%${input.searchQuery.trim()}%`;
        conditions.push(or(ilike(users.email, searchTerm), ilike(users.displayName, searchTerm))!);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [{ total }] = await db.select({ total: count() }).from(users).where(whereClause);

      // Get paginated users
      const userList = await db
        .select({
          id: users.id,
          email: users.email,
          emailVerified: users.emailVerified,
          displayName: users.displayName,
          profileImageUrl: users.profileImageUrl,
          stripeCustomerId: users.stripeCustomerId,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(sql`${users.createdAt} DESC`)
        .limit(pageSize)
        .offset(offset);

      return {
        users: userList,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

    /**
     * Get single user details with subscriptions and memberships
     */
    get: superAdminProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
      const [user] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      // Get user subscriptions
      const subscriptions = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, input.id));

      // Get user memberships with organization details
      const memberships = await db
        .select({
          id: orgMemberships.id,
          role: orgMemberships.role,
          createdAt: orgMemberships.createdAt,
          organization: {
            id: organizations.id,
            name: organizations.name,
            slug: organizations.slug,
          },
        })
        .from(orgMemberships)
        .innerJoin(organizations, eq(orgMemberships.organizationId, organizations.id))
        .where(eq(orgMemberships.userId, input.id));

      return {
        user,
        subscriptions,
        memberships,
      };
    }),

    /**
     * Update user details
     */
    update: superAdminProcedure.input(adminUpdateUserSchema).mutation(async ({ input }) => {
      const { id, ...updates } = input;

      const [updated] = await db
        .update(users)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      return updated;
    }),

    /**
     * Delete user (cascades to sessions, memberships, etc.)
     */
    delete: superAdminProcedure.input(adminDeleteUserSchema).mutation(async ({ input }) => {
      const [deleted] = await db.delete(users).where(eq(users.id, input.id)).returning();

      if (!deleted) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      return { success: true, deletedUser: deleted };
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
     * Update organization details
     */
    update: superAdminProcedure.input(adminUpdateOrgSchema).mutation(async ({ input }) => {
      const { id, ...updates } = input;

      const [updated] = await db
        .update(organizations)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      }

      return updated;
    }),

    /**
     * Delete organization (cascades to memberships, invitations, etc.)
     */
    delete: superAdminProcedure.input(adminDeleteOrgSchema).mutation(async ({ input }) => {
      const [deleted] = await db
        .delete(organizations)
        .where(eq(organizations.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      }

      return { success: true, deletedOrganization: deleted };
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
      const [updated] = await db
        .update(orgMemberships)
        .set({ role: input.role })
        .where(eq(orgMemberships.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Membership not found' });
      }

      return updated;
    }),

    /**
     * Delete membership
     */
    delete: superAdminProcedure.input(adminDeleteMembershipSchema).mutation(async ({ input }) => {
      const [deleted] = await db
        .delete(orgMemberships)
        .where(eq(orgMemberships.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Membership not found' });
      }

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
