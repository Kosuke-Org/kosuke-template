import { TRPCError } from '@trpc/server';
import { and, desc, eq, ilike } from 'drizzle-orm';

import {
  createFileSearchStore,
  deleteDocumentFromFileSearchStore,
  deleteFileSearchStore,
  uploadToFileSearchStore,
} from '@/lib/ai/client';
import { db } from '@/lib/db/drizzle';
import { documents, organizations, users } from '@/lib/db/schema';
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
   * Upload a document to S3 and Google File Search Store
   */
  upload: orgProcedure.input(uploadDocumentSchema).mutation(async ({ ctx, input }) => {
    const { organizationId, displayName, mimeType, sizeBytes, fileBase64 } = input;
    const { userId } = ctx;

    // Get organization to use slug for file search store name
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
    const base64Data = fileBase64.split(',')[1] || fileBase64;
    const fileBuffer = Buffer.from(base64Data, 'base64');

    const file = new File([fileBuffer], displayName, { type: mimeType });

    // Upload file to S3 or local storage
    const storageUrl = await uploadDocument(file, organizationId);

    // Check if organization already has a file search store
    let fileSearchStoreName: string;

    const existingDoc = await db.query.documents.findFirst({
      where: eq(documents.organizationId, organizationId),
    });

    if (existingDoc) {
      fileSearchStoreName = existingDoc.fileSearchStoreName;
    } else {
      const store = await createFileSearchStore({
        displayName: `${org.slug}-documents`,
      });
      fileSearchStoreName = store.name ?? 'default';
    }

    // Upload file to Google File Search Store
    const blob = new Blob([fileBuffer], { type: mimeType });

    const operation = await uploadToFileSearchStore({
      file: blob,
      fileSearchStoreName,
      config: {
        displayName,
        mimeType,
      },
    });

    if (!operation.done || !operation.response || !operation.response.documentName) {
      // Cleanup: Delete from storage if File Search upload fails
      await deleteDocument(storageUrl);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to upload document to File Search Store',
      });
    }

    const documentResourceName = operation.response.documentName;

    // Store document metadata in database
    const [newDocument] = await db
      .insert(documents)
      .values({
        organizationId,
        userId,
        documentResourceName,
        displayName,
        mimeType,
        sizeBytes,
        storageUrl,
        fileSearchStoreName,
      })
      .returning();

    return newDocument;
  }),

  /**
   * Delete a document from S3, File Search Store, and database
   */
  delete: orgProcedure.input(deleteDocumentSchema).mutation(async ({ input }) => {
    const { organizationId, id } = input;

    const document = await db.query.documents.findFirst({
      where: and(eq(documents.id, id), eq(documents.organizationId, organizationId)),
    });

    if (!document) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document not found',
      });
    }

    // Delete from database
    await db
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.organizationId, organizationId)));

    // Delete from S3 or local storage
    await deleteDocument(document.storageUrl);

    // Delete document chunks from File Search Store
    try {
      await deleteDocumentFromFileSearchStore({ name: document.documentResourceName });
    } catch (error) {
      console.error('Failed to delete document from File Search Store:', error);
      // Continue with DB deletion even if File Search deletion fails
    }

    // Check if this was the last document in the file search store
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

    return { success: true };
  }),
});
