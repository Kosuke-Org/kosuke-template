/**
 * BullMQ Queue Module
 *
 * Centralized export for all queue functionality.
 */
import { scheduleSubscriptionSync } from './queues/subscriptions';

// Import other schedule functions as you add more queues

// Core utilities
export { createQueue, createWorker, createQueueEvents, gracefulShutdown } from './client';

// Constants
export { QUEUE_NAMES, JOB_NAMES } from './config';

// Subscription queue
export {
  subscriptionQueue,
  addSubscriptionSyncJob,
  scheduleSubscriptionSync,
  type SubscriptionSyncJobData,
} from './queues/subscriptions';

// Documents queue
export { documentsQueue, addIndexDocumentJob, type IndexDocumentJobData } from './queues/documents';

// Email queue (background operations only)
export {
  emailQueue,
  addToMarketingSegmentJob,
  removeFromMarketingSegmentJob,
  type AddToMarketingSegmentJobData,
  type RemoveFromMarketingSegmentJobData,
} from './queues/email';

// Workers (for worker.ts)
export { subscriptionWorker } from './workers/subscriptions';
export { documentsWorker } from './workers/documents';
export { emailWorker } from './workers/email';

// Job processors (for testing/debugging)
export { processSubscriptionSync } from './jobs/sync-subscriptions';
export { processIndexDocument } from './jobs/index-document';
export { processAddToMarketingSegment, processRemoveFromMarketingSegment } from './jobs/email';

/**
 * Schedule all recurring jobs
 *
 * Call this once when the worker process starts.
 * Idempotent - safe to call multiple times.
 */
export async function scheduleAllJobs(): Promise<void> {
  await Promise.all([
    scheduleSubscriptionSync(),
    // Add more schedule functions here as you add queues
  ]);
}
