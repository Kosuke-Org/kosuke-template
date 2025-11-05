import { createWorker, createQueueEvents } from '../client';
import { SUBSCRIPTION_SYNC_QUEUE } from '../queues/subscriptions';
import { processSubscriptionSync } from '../jobs/sync-subscriptions';
import type { SubscriptionSyncJobData } from '../queues/subscriptions';
import * as Sentry from '@sentry/nextjs';

/**
 * Subscription sync worker
 * Processes jobs from the subscription sync queue
 */
export const subscriptionWorker = createWorker<SubscriptionSyncJobData>(
  SUBSCRIPTION_SYNC_QUEUE,
  async (job) => {
    console.log(`🔄 Processing subscription sync job: ${job.id}`);

    try {
      const result = await processSubscriptionSync(job.data);
      console.log(`✅ Job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);

      // Report to Sentry
      Sentry.captureException(error, {
        tags: {
          jobId: job.id,
          jobType: 'subscription-sync',
        },
        extra: {
          jobData: job.data,
        },
      });

      throw error; // Re-throw to mark job as failed
    }
  }
);

/**
 * Queue events listener for monitoring and logging
 */
const queueEvents = createQueueEvents(SUBSCRIPTION_SYNC_QUEUE);

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`✅ Job ${jobId} completed:`, returnvalue);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`❌ Job ${jobId} failed:`, failedReason);
});

queueEvents.on('progress', ({ jobId, data }) => {
  console.log(`📊 Job ${jobId} progress:`, data);
});

/**
 * Worker error handlers
 */
subscriptionWorker.on('error', (error) => {
  console.error('🚨 Worker error:', error);
  Sentry.captureException(error, {
    tags: {
      component: 'subscription-worker',
    },
  });
});

subscriptionWorker.on('active', (job) => {
  console.log(`🏃 Job ${job.id} started processing`);
});

subscriptionWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} has been completed`);
});

subscriptionWorker.on('failed', (job, error) => {
  console.error(`❌ Job ${job?.id} has failed with error:`, error);
});

console.log('🚀 Subscription worker initialized and ready to process jobs');
