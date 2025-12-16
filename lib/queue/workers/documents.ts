/**
 * Document Indexing Worker
 *
 * Thin wrapper - only handles worker lifecycle and events.
 * Business logic is in jobs/index-document.ts
 */
import { createQueueEvents, createWorker } from '../client';
import { QUEUE_NAMES } from '../config';
import { processIndexDocument } from '../jobs/index-document';
import type { IndexDocumentJobData } from '../queues/documents';

/**
 * Document indexing worker
 */
export const documentsWorker = createWorker<IndexDocumentJobData>(
  QUEUE_NAMES.DOCUMENTS,
  async (job) => {
    // Just call the processor - no business logic here!
    return await processIndexDocument(job.data);
  },
  {
    concurrency: 5, // Process 5 documents concurrently
  }
);

/**
 * Queue events for monitoring
 */
const documentsEvents = createQueueEvents(QUEUE_NAMES.DOCUMENTS);

documentsEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`[DOCUMENTS] ✅ Job ${jobId} completed:`, returnvalue);
});

documentsEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[DOCUMENTS] ❌ Job ${jobId} failed:`, failedReason);
});

documentsEvents.on('progress', ({ jobId, data }) => {
  console.log(`[DOCUMENTS] 📊 Job ${jobId} progress:`, data);
});

console.log('[DOCUMENTS] 🚀 Worker initialized');
