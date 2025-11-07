import { createQueue } from '../client';

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

export const SUBSCRIPTION_SYNC_QUEUE = 'subscription-sync';

export const subscriptionQueue = createQueue<SubscriptionSyncJobData>(SUBSCRIPTION_SYNC_QUEUE);

/**
 * Add subscription sync job to the queue
 */
export async function addSubscriptionSyncJob(data: SubscriptionSyncJobData = {}) {
  return await subscriptionQueue.add('sync-subscriptions', data, {
    // Remove duplicate jobs - don't queue if already pending
    jobId: data.userId ? `sync-${data.userId}` : 'sync-all',
    removeOnComplete: true,
  });
}

/**
 * Schedule recurring subscription sync (daily at midnight)
 * This replaces the Vercel cron job
 */
export async function scheduleSubscriptionSync() {
  // Remove existing repeatable jobs first
  const repeatableJobs = await subscriptionQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await subscriptionQueue.removeRepeatableByKey(job.key);
  }

  // Add new repeatable job - runs daily at midnight
  await subscriptionQueue.add(
    'sync-subscriptions-scheduled',
    {},
    {
      repeat: {
        pattern: '0 0 * * *', // Every day at midnight (cron format)
      },
      jobId: 'sync-scheduled',
    }
  );

  console.log('✅ Scheduled daily subscription sync at midnight');
}
