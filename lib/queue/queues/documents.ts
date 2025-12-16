import { createQueue } from '../client';
import { JOB_NAMES, QUEUE_NAMES } from '../config';

/**
 * Document indexing queue
 * Handles async upload of documents to Google File Search Store
 */

export interface IndexDocumentJobData {
  /**
   * Document ID in our database
   */
  documentId: string;

  /**
   * Organization ID
   */
  organizationId: string;

  /**
   * Storage URL where file is stored
   */
  storageUrl: string;

  /**
   * Display name for the document
   */
  displayName: string;

  /**
   * MIME type
   */
  mimeType: string;

  /**
   * File buffer as base64 (optional - only for initial upload)
   * If not provided, will fetch from storageUrl (used for retries)
   */
  fileBase64?: string;
}

export const documentsQueue = createQueue<IndexDocumentJobData>(QUEUE_NAMES.DOCUMENTS);

/**
 * Add document indexing job to the queue
 */
export async function addIndexDocumentJob(data: IndexDocumentJobData) {
  return await documentsQueue.add(JOB_NAMES.INDEX_DOCUMENT, data, {
    jobId: `index-${data.documentId}`, // Prevent duplicate jobs for same document
    priority: 0, // High priority - user is waiting
    removeOnComplete: {
      age: 3600, // Keep for 1 hour
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds
    },
  });
}
