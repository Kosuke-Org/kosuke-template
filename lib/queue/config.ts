/**
 * BullMQ Queue Constants
 *
 * Centralized queue and job names for type safety and consistency.
 * Import these constants instead of using string literals to prevent typos.
 */

/**
 * Queue names - one queue per domain/feature
 */
export const QUEUE_NAMES = {
  SUBSCRIPTIONS: 'subscription-sync',
  DOCUMENTS: 'documents',
  EMAIL: 'email',
  // Add more queues here as needed
} as const;

/**
 * Job names - organized by queue
 */
export const JOB_NAMES = {
  // Subscription queue jobs
  SYNC_SUBSCRIPTIONS: 'sync-subscriptions',
  SYNC_SUBSCRIPTIONS_SCHEDULED: 'sync-subscriptions-scheduled',
  // Document queue jobs
  INDEX_DOCUMENT: 'index-document',
  // Email queue jobs (background operations only)
  ADD_TO_MARKETING_SEGMENT: 'add-to-marketing-segment',
  REMOVE_FROM_MARKETING_SEGMENT: 'remove-from-marketing-segment',
  // Add more job names here as needed
} as const;
