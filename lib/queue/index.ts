/**
 * BullMQ Queue System
 * Centralized export for queue management
 */

// Core utilities
export { createQueue, createWorker, createQueueEvents, gracefulShutdown } from './client';

// Subscription sync - Public API
export {
  subscriptionQueue,
  addSubscriptionSyncJob,
  scheduleSubscriptionSync,
  SUBSCRIPTION_SYNC_QUEUE,
  type SubscriptionSyncJobData,
} from './queues/subscriptions';

// Workers (for init-workers.ts)
export { subscriptionWorker } from './workers/subscriptions';

// Job processors (for testing/debugging)
export { processSubscriptionSync } from './jobs/sync-subscriptions';
