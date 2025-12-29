import { createQueue } from '../client';
import { JOB_NAMES, QUEUE_NAMES } from '../config';

/**
 * Email queue with rate limiting for Resend API
 * Handles marketing-related operations (non-time-sensitive)
 *
 * Note: Transactional emails (OTP, invitations, etc.) are sent immediately
 * without queueing to ensure users receive them instantly.
 */

export interface AddToMarketingSegmentJobData {
  email: string;
}

export interface RemoveFromMarketingSegmentJobData {
  email: string;
}

// Create email queue with rate limiting
// Resend free tier: 2 requests/second
// We use 1.8 req/sec (555ms between jobs) to be safe
export const emailQueue = createQueue<
  AddToMarketingSegmentJobData | RemoveFromMarketingSegmentJobData
>(QUEUE_NAMES.EMAIL);

/**
 * Add "add to marketing segment" job to the queue
 *
 * @param data - Email address to add to marketing segment
 * @returns Promise<Job> - The queued job
 *
 * @example
 * // During user sign-up with marketing consent
 * await addToMarketingSegmentJob({ email: 'user@example.com' });
 *
 * @note This is non-blocking and queued for background processing
 * @note Job is deduplicated by email address (prevents duplicate additions)
 */
export async function addToMarketingSegmentJob(data: AddToMarketingSegmentJobData) {
  return await emailQueue.add(JOB_NAMES.ADD_TO_MARKETING_SEGMENT, data, {
    jobId: `add-marketing-${data.email}`, // Prevent duplicates for pending/active jobs
    priority: 10, // Low priority - marketing operations
    removeOnComplete: true, // Remove immediately to allow re-toggling
    removeOnFail: {
      age: 86400, // Keep failed jobs for debugging
    },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
}

/**
 * Add "remove from marketing segment" job to the queue
 *
 * @param data - Email address to remove from marketing segment
 * @returns Promise<Job> - The queued job
 *
 * @example
 * // When user opts out of marketing emails
 * await removeFromMarketingSegmentJob({ email: 'user@example.com' });
 *
 * @note This is non-blocking and queued for background processing
 * @note Job is deduplicated by email address (prevents duplicate removals)
 */
export async function removeFromMarketingSegmentJob(data: RemoveFromMarketingSegmentJobData) {
  return await emailQueue.add(JOB_NAMES.REMOVE_FROM_MARKETING_SEGMENT, data, {
    jobId: `remove-marketing-${data.email}`, // Prevent duplicates for pending/active jobs
    priority: 10, // Low priority
    removeOnComplete: true, // Remove immediately to allow re-toggling
    removeOnFail: {
      age: 86400, // Keep failed jobs for debugging
    },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
}
