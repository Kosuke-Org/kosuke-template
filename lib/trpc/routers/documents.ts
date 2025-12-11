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
import {
  deleteDocumentSchema,
  listDocumentsSchema,
  uploadDocumentSchema,
} from '@/lib/trpc/schemas/documents';

import { protectedProcedure, router } from '../init';

export const documentsRouter = router({
  /**
   * List all documents for an organization
   */
  list: protectedProcedure.input(listDocumentsSchema).query(async ({ ctx, input }) => {
    const { organizationId, searchQuery, page, pageSize } = input;

    // Verify user is member of organization
    const membership = await db.query.orgMemberships.findFirst({
      where: (memberships, { and, eq }) =>
        and(eq(memberships.organizationId, organizationId), eq(memberships.userId, ctx.userId)),
    });

    if (!membership) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this organization',
      });
    }

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
  upload: protectedProcedure.input(uploadDocumentSchema).mutation(async ({ ctx, input }) => {
    const { organizationId, displayName, mimeType, sizeBytes, fileBase64 } = input;
    const membership = await db.query.orgMemberships.findFirst({
      where: (memberships, { and, eq }) =>
        and(eq(memberships.organizationId, organizationId), eq(memberships.userId, ctx.userId)),
    });

    if (!membership) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this organization',
      });
    }

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

    // 3. Upload file to Google File Search Store
    // Google AI SDK expects a Blob, not a base64 string or File path
    const blob = new Blob([fileBuffer], { type: mimeType });

    const operation = await uploadToFileSearchStore({
      file: blob,
      fileSearchStoreName,
      config: {
        displayName,
        mimeType,
      },
    });

    if (!operation.done || !operation.response) {
      // Cleanup: Delete from storage if File Search upload fails
      await deleteDocument(storageUrl);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to upload document to File Search Store',
      });
    }

    // Extract document name from response (format: fileSearchStores/*/documents/*)
    const documentName = operation.response?.documentName;

    if (!documentName) {
      // Cleanup: Delete from storage if no document name returned
      await deleteDocument(storageUrl);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'No document name returned from File Search Store',
      });
    }

    // 4. Store document metadata in database
    const [newDocument] = await db
      .insert(documents)
      .values({
        organizationId,
        userId: ctx.userId,
        documentResourceName: documentName,
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
  delete: protectedProcedure.input(deleteDocumentSchema).mutation(async ({ ctx, input }) => {
    // Verify user is member of organization
    const membership = await db.query.orgMemberships.findFirst({
      where: (memberships, { and, eq }) =>
        and(
          eq(memberships.organizationId, input.organizationId),
          eq(memberships.userId, ctx.userId)
        ),
    });

    if (!membership) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this organization',
      });
    }

    const document = await db.query.documents.findFirst({
      where: and(eq(documents.id, input.id), eq(documents.organizationId, input.organizationId)),
    });

    if (!document) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document not found',
      });
    }

    // 1. Delete from S3 or local storage
    await deleteDocument(document.storageUrl);

    // 2. Delete document chunks from File Search Store
    try {
      await deleteDocumentFromFileSearchStore(document.documentResourceName);
    } catch (error) {
      console.error('Failed to delete document from File Search Store:', error);
      // Continue with DB deletion even if File Search deletion fails
    }

    // 3. Delete from database
    await db
      .delete(documents)
      .where(and(eq(documents.id, input.id), eq(documents.organizationId, input.organizationId)));

    // 4. Check if this was the last document in the file search store
    const remainingDocs = await db.query.documents.findFirst({
      where: eq(documents.fileSearchStoreName, document.fileSearchStoreName),
    });

    // If no more documents, delete the file search store
    if (!remainingDocs) {
      try {
        await deleteFileSearchStore(document.fileSearchStoreName);
      } catch (error) {
        console.error('Failed to delete file search store:', error);
        // Don't throw error as document is already deleted
      }
    }

    return { success: true };
  }),
});
