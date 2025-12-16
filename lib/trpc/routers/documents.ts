import { TRPCError } from '@trpc/server';
import { and, desc, eq, ilike } from 'drizzle-orm';

import { deleteDocumentFromFileSearchStore, deleteFileSearchStore } from '@/lib/ai/client';
import { db } from '@/lib/db/drizzle';
import { documents, organizations, users } from '@/lib/db/schema';
import { addIndexDocumentJob } from '@/lib/queue/queues/documents';
import { deleteDocument, uploadDocument } from '@/lib/storage';
import { orgProcedure, router } from '@/lib/trpc/init';
import {
  deleteDocumentSchema,
  listDocumentsSchema,
  uploadDocumentSchema,
} from '@/lib/trpc/schemas/documents';

export const documentsRouter = router({
  /**
   * List all documents for an organization
   */
  list: orgProcedure.input(listDocumentsSchema).query(async ({ input }) => {
    const { organizationId, searchQuery, page, pageSize } = input;

    const conditions = [eq(documents.organizationId, organizationId)];

    // Add search filter
    if (searchQuery && searchQuery.trim()) {
      const searchTerm = `%${searchQuery.trim()}%`;
      conditions.push(ilike(documents.displayName, searchTerm));
    }

    const offset = (page - 1) * pageSize;

    const totalResult = await db
      .select({ count: documents.id })
      .from(documents)
      .where(and(...conditions));
    const total = totalResult.length;

    const results = await db
      .select({
        id: documents.id,
        organizationId: documents.organizationId,
        displayName: documents.displayName,
        sizeBytes: documents.sizeBytes,
        status: documents.status,
        fileSearchStoreName: documents.fileSearchStoreName,
        createdAt: documents.createdAt,
        userDisplayName: users.displayName,
      })
      .from(documents)
      .leftJoin(users, eq(documents.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt))
      .limit(pageSize)
      .offset(offset);

    return {
      documents: results,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }),

  /**
   * Upload a document to S3 and queue for File Search indexing
   * Returns immediately after S3 upload - indexing happens async
   */
  upload: orgProcedure.input(uploadDocumentSchema).mutation(async ({ ctx, input }) => {
    const { organizationId, displayName, mimeType, sizeBytes, fileData } = input;
    const { userId } = ctx;

    // Get organization to check it exists
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!org) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    // Convert base64 to buffer (strip data URL prefix if present)
    const base64Data = fileData.split(',')[1] || fileData;
    const fileBuffer = Buffer.from(base64Data, 'base64');
    const file = new File([fileBuffer], displayName, { type: mimeType });

    const storageUrl = await uploadDocument(file, organizationId);

    // Store document metadata in database with 'in_progress' status
    // documentResourceName and fileSearchStoreName will be set by the queue job
    const [newDocument] = await db
      .insert(documents)
      .values({
        organizationId,
        userId,
        displayName,
        mimeType,
        sizeBytes,
        storageUrl,
        status: 'in_progress',
      })
      .returning();

    // Queue document for File Search indexing (async)
    await addIndexDocumentJob({
      documentId: newDocument.id,
      organizationId,
      storageUrl,
      displayName,
      mimeType,
      fileData,
    });

    console.log('[DOCUMENTS] 📤 Document uploaded to storage, queued for indexing:', {
      documentId: newDocument.id,
      displayName,
    });

    return newDocument;
  }),

  /**
   * Delete a document from S3, File Search Store, and database
   */
  delete: orgProcedure.input(deleteDocumentSchema).mutation(async ({ ctx, input }) => {
    const { organizationId, id } = input;
    const { membership } = ctx;

    const document = await db.query.documents.findFirst({
      where: and(eq(documents.id, id), eq(documents.organizationId, organizationId)),
    });

    if (!document) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document not found',
      });
    }

    // Check user permissions: only owners/admins or document owner can delete
    const isOwnerOrAdmin = membership.role === 'owner' || membership.role === 'admin';
    const isDocumentOwner = document.userId === ctx.userId;

    if (!isOwnerOrAdmin && !isDocumentOwner) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete this document',
      });
    }

    // Delete from database
    await db
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.organizationId, organizationId)));

    // Delete from S3 or local storage
    await deleteDocument(document.storageUrl);

    // Delete document chunks from File Search Store (only if indexed)
    if (document.documentResourceName && document.status === 'ready') {
      try {
        await deleteDocumentFromFileSearchStore({ name: document.documentResourceName });
      } catch (error) {
        console.error('Failed to delete document from File Search Store:', error);
        // Continue with DB deletion even if File Search deletion fails
      }

      // Check if this was the last document in the file search store
      if (document.fileSearchStoreName) {
        const remainingDocs = await db.query.documents.findFirst({
          where: eq(documents.fileSearchStoreName, document.fileSearchStoreName),
        });

        // If no more documents, delete the file search store
        if (!remainingDocs) {
          try {
            await deleteFileSearchStore({ name: document.fileSearchStoreName });
          } catch (error) {
            console.error('Failed to delete file search store:', error);
            // Don't throw error as document is already deleted
          }
        }
      }
    }

    return { success: true };
  }),
});
