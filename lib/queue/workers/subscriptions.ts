/**
 * Subscription Sync Worker
 *
 * Thin wrapper - only handles worker lifecycle and events.
 * Business logic is in jobs/sync-subscriptions.ts
 */
import { createQueueEvents, createWorker } from '../client';
import { QUEUE_NAMES } from '../config';
import { processSubscriptionSync } from '../jobs/sync-subscriptions';
import type { SubscriptionSyncJobData } from '../queues/subscriptions';

/**
 * Subscription sync worker
 */
export const subscriptionWorker = createWorker<SubscriptionSyncJobData>(
  QUEUE_NAMES.SUBSCRIPTIONS,
  async (job) => {
    // Just call the processor - no business logic here!
    return await processSubscriptionSync(job.data);
  },
  {
    concurrency: 2, // Process 2 jobs concurrently
  }
);

/**
 * Queue events for monitoring
 */
const subscriptionEvents = createQueueEvents(QUEUE_NAMES.SUBSCRIPTIONS);

subscriptionEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`[SUBSCRIPTIONS] ✅ Job ${jobId} completed:`, returnvalue);
});

subscriptionEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[SUBSCRIPTIONS] ❌ Job ${jobId} failed:`, failedReason);
});

subscriptionEvents.on('progress', ({ jobId, data }) => {
  console.log(`[SUBSCRIPTIONS] 📊 Job ${jobId} progress:`, data);
});

console.log('[SUBSCRIPTIONS] 🚀 Worker initialized');
