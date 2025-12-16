/**
 * Document Indexing Job Processor
 *
 * Handles async upload of documents to Google File Search Store
 * Updates document status in database (in_progress -> ready/error)
 */
import { eq } from 'drizzle-orm';

import { createFileSearchStore, uploadToFileSearchStore } from '@/lib/ai/client';
import { db } from '@/lib/db/drizzle';
import { documents, organizations } from '@/lib/db/schema';
import type { IndexDocumentJobData } from '@/lib/queue/queues/documents';

export async function processIndexDocument({
  fileData,
  storageUrl,
  displayName,
  mimeType,
  organizationId,
  documentId,
}: IndexDocumentJobData): Promise<{
  success: boolean;
  documentId: string;
  status: 'ready' | 'error';
}> {
  console.log('[JOB] 📄 Starting document indexing...', {
    documentId,
    displayName,
  });

  const startTime = Date.now();

  try {
    let fileBuffer: Buffer;

    if (fileData) {
      // Direct upload - data passed from upload mutation (data URL or base64)
      const base64Data = fileData.split(',')[1] || fileData;
      fileBuffer = Buffer.from(base64Data, 'base64');
    } else {
      // Retry - fetch from storage using native fetch
      const response = await fetch(storageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch document from storage: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    }

    // Get organization to check if file search store exists
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    let fileSearchStoreName: string;

    const existingDoc = await db.query.documents.findFirst({
      where: eq(documents.organizationId, organizationId),
      columns: {
        fileSearchStoreName: true,
      },
    });

    if (existingDoc?.fileSearchStoreName) {
      fileSearchStoreName = existingDoc.fileSearchStoreName;
    } else {
      const store = await createFileSearchStore({
        displayName: `${org.slug}-documents`,
      });
      fileSearchStoreName = store.name ?? 'default';
    }

    // Upload file to Google File Search Store
    const blob = new Blob([fileBuffer as unknown as BlobPart], { type: mimeType });

    const operation = await uploadToFileSearchStore({
      file: blob,
      fileSearchStoreName,
      config: {
        displayName,
        mimeType,
        customMetadata: [
          // Can later be used for querying the document
          // https://ai.google.dev/gemini-api/docs/file-search#metadata
          {
            key: 'document_id',
            stringValue: documentId,
          },
        ],
      },
    });

    // Poll operation status until complete
    // Note: Google AI SDK returns operation with done=true immediately if upload succeeded
    // But we check just in case for long-running operations
    if (!operation.done || !operation.response) {
      throw new Error('File Search upload operation did not complete');
    }

    const documentName = operation.response?.documentName;

    if (!documentName) {
      throw new Error('No document name returned from File Search Store');
    }

    // Update document in database with success status
    await db
      .update(documents)
      .set({
        documentResourceName: documentName,
        fileSearchStoreName,
        status: 'ready',
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    const duration = Date.now() - startTime;

    console.log('[JOB]  Document indexed successfully:', {
      documentId,
      duration: `${duration}ms`,
    });

    return {
      success: true,
      documentId,
      status: 'ready',
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('[JOB] Document indexing failed:', {
      documentId,
      organizationId,
      displayName,
      mimeType,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
    });

    // Update document status to error
    await db
      .update(documents)
      .set({
        status: 'error',
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    throw error;
  }
}
