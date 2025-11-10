import { createQueue } from '../client';
import { QUEUE_NAMES, JOB_NAMES } from '../config';

/**
 * Subscription sync queue
 * Handles periodic syncing of subscription data from Stripe
 */

export interface SubscriptionSyncJobData {
  /**
   * Optional: Sync specific user's subscription
   * If not provided, syncs all subscriptions
   */
  userId?: string;

  /**
   * Triggered by admin/manual action
   */
  manual?: boolean;
}

export const subscriptionQueue = createQueue<SubscriptionSyncJobData>(QUEUE_NAMES.SUBSCRIPTIONS);

/**
 * Add subscription sync job to the queue
 */
export async function addSubscriptionSyncJob(data: SubscriptionSyncJobData = {}) {
  return await subscriptionQueue.add(JOB_NAMES.SYNC_SUBSCRIPTIONS, data, {
    // Remove duplicate jobs - don't queue if already pending
    jobId: data.userId ? `sync-${data.userId}` : 'sync-all',
    priority: data.manual ? 0 : 1, // Manual jobs get higher priority
    removeOnComplete: true,
  });
}

/**
 * Schedule recurring subscription sync (daily at midnight)
 * This replaces the Vercel cron job
 * Idempotent - safe to call multiple times
 */
export async function scheduleSubscriptionSync() {
  await subscriptionQueue.upsertJobScheduler(
    `${JOB_NAMES.SYNC_SUBSCRIPTIONS}-scheduler`,
    {
      pattern: '0 0 * * *', // Every day at midnight (cron format)
    },
    {
      name: JOB_NAMES.SYNC_SUBSCRIPTIONS_SCHEDULED,
      data: {},
      opts: {
        priority: 1,
      },
    }
  );

  console.log('[QUEUE] ✅ Scheduled subscription sync (daily at midnight)');
}
