import { Worker } from 'bullmq';

import { redis } from '@/lib/redis';

import { createQueueEvents } from '../client';
import { JOB_NAMES, QUEUE_NAMES } from '../config';
import { processAddToMarketingSegment, processRemoveFromMarketingSegment } from '../jobs/email';
import type {
  AddToMarketingSegmentJobData,
  RemoveFromMarketingSegmentJobData,
} from '../queues/email';

/**
 * Email worker with rate limiting
 * Processes marketing-related email operations with proper rate limiting for Resend API
 *
 * This worker only handles background marketing operations.
 *
 * Rate limiting strategy:
 * - Worker processes 1 job per 2 seconds (max: 1, duration: 2000ms)
 * - Each job makes 3-4 API calls with 600ms delays between them
 * - This respects Resend's 2 req/sec limit: max 4 calls in 2.4 seconds = 1.67 avg req/sec
 * - Resend free tier: 2 requests/second
 */
export const emailWorker = new Worker<
  AddToMarketingSegmentJobData | RemoveFromMarketingSegmentJobData
>(
  QUEUE_NAMES.EMAIL,
  async (job) => {
    switch (job.name) {
      case JOB_NAMES.ADD_TO_MARKETING_SEGMENT:
        await processAddToMarketingSegment(job.data as AddToMarketingSegmentJobData);
        break;

      case JOB_NAMES.REMOVE_FROM_MARKETING_SEGMENT:
        await processRemoveFromMarketingSegment(job.data as RemoveFromMarketingSegmentJobData);
        break;

      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection: redis,
    concurrency: 1,
    limiter: {
      max: 1, // Maximum 1 job
      duration: 2000, // Per 2 seconds
    },
  }
);

/**
 * Queue events for monitoring
 */
const emailEvents = createQueueEvents(QUEUE_NAMES.EMAIL);

emailEvents.on('completed', ({ jobId }) => {
  console.log(`[EMAIL] ✅ Job ${jobId} completed`);
});

emailEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[EMAIL] ❌ Job ${jobId} failed:`, failedReason);
});

emailEvents.on('progress', ({ jobId, data }) => {
  console.log(`[EMAIL] 📊 Job ${jobId} progress:`, data);
});

console.log('[EMAIL] 🚀 Worker initialized');
