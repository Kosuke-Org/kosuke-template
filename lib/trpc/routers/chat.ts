import { TRPCError } from '@trpc/server';
import { UIDataTypes, UIMessagePart, UITools } from 'ai';
import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { chatMessages, chatSessions, documents } from '@/lib/db/schema';
import { getPresignedDownloadUrl } from '@/lib/storage';
import { orgProcedure, router } from '@/lib/trpc/init';
import {
  createChatSessionSchema,
  deleteChatSessionSchema,
  getMessagesSchema,
  getSessionSchema,
  listChatSessionsSchema,
  updateChatSessionTitleSchema,
} from '@/lib/trpc/schemas/documents';

// Sources are now stored in message metadata (not parts)
// Metadata format: { sources: [{ documentId: string, title: string, url?: string }] }

export const chatRouter = router({
  /**
   * List all chat sessions for an organization
   */
  listSessions: orgProcedure.input(listChatSessionsSchema).query(async ({ ctx, input }) => {
    const { page, pageSize, organizationId } = input;
    const offset = (page - 1) * pageSize;

    // Get total count for user's sessions only
    const totalResult = await db
      .select({ count: chatSessions.id })
      .from(chatSessions)
      .where(
        and(eq(chatSessions.organizationId, organizationId), eq(chatSessions.userId, ctx.userId))
      );
    const total = totalResult.length;

    // Get paginated results
    const sessions = await db
      .select()
      .from(chatSessions)
      .where(
        and(eq(chatSessions.organizationId, organizationId), eq(chatSessions.userId, ctx.userId))
      )
      .orderBy(desc(chatSessions.updatedAt))
      .limit(pageSize)
      .offset(offset);

    return {
      sessions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }),

  getSession: orgProcedure.input(getSessionSchema).query(async ({ ctx, input }) => {
    const { organizationId, chatSessionId } = input;

    const session = await db.query.chatSessions.findFirst({
      where: and(
        eq(chatSessions.id, chatSessionId),
        eq(chatSessions.organizationId, organizationId),
        eq(chatSessions.userId, ctx.userId)
      ),
    });

    if (!session) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Chat session not found',
      });
    }

    return session;
  }),

  /**
   * Get all messages for a chat session in UIMessage format with enriched source URLs
   */
  getMessages: orgProcedure.input(getMessagesSchema).query(async ({ ctx, input }) => {
    const { organizationId, chatSessionId } = input;

    // Verify session exists and belongs to organization
    const session = await db.query.chatSessions.findFirst({
      where: and(
        eq(chatSessions.id, chatSessionId),
        eq(chatSessions.organizationId, organizationId),
        eq(chatSessions.userId, ctx.userId)
      ),
    });

    if (!session) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Chat session not found',
      });
    }

    // Get messages ordered by creation time
    const rawMessages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.chatSessionId, chatSessionId))
      .orderBy(asc(chatMessages.createdAt));

    // Get all documents for the organization to match with sources
    const orgDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.organizationId, organizationId));

    // Enrich messages with source URLs
    const messagesWithSources = await Promise.all(
      rawMessages.map(async (message) => {
        // Enrich source-document parts with presigned URLs
        let enrichedMetadata = message.metadata ? JSON.parse(message.metadata) : undefined;
        if (enrichedMetadata?.sources && Array.isArray(enrichedMetadata.sources)) {
          enrichedMetadata = {
            ...enrichedMetadata,
            sources: await Promise.all(
              enrichedMetadata.sources.map(
                async (source: { documentId: string; title: string; url?: string }) => {
                  // Match source with database document by ID (stable identifier)
                  const doc = orgDocuments.find((d) => d.id === source.documentId);

                  // Generate fresh presigned URL if document found with storage key
                  if (doc?.storageUrl) {
                    try {
                      const presignedUrl = await getPresignedDownloadUrl(doc.storageUrl);
                      return {
                        title: doc.displayName, // Use current display name (in case it was edited)
                        url: presignedUrl,
                      };
                    } catch (error) {
                      console.error('Failed to generate presigned URL for source:', error);
                      // Return with current title but no URL
                      return {
                        title: doc.displayName,
                        url: undefined,
                      };
                    }
                  }

                  // Document not found or no storage URL
                  return {
                    title: source.title, // Use stored title as fallback
                    url: undefined,
                  };
                }
              )
            ),
          };
        }

        const parts = JSON.parse(message.parts) as UIMessagePart<UIDataTypes, UITools>[];

        return {
          id: message.id,
          role: message.role,
          parts,
          metadata: enrichedMetadata as {
            sources: { title: string; url?: string }[];
          },
          createdAt: message.createdAt,
        };
      })
    );

    return { messages: messagesWithSources };
  }),

  /**
   * Create a new chat session
   */
  createSession: orgProcedure.input(createChatSessionSchema).mutation(async ({ ctx, input }) => {
    const { organizationId, title } = input;

    const [session] = await db
      .insert(chatSessions)
      .values({
        organizationId,
        userId: ctx.userId,
        title,
      })
      .returning();

    return session;
  }),

  /**
   * Delete a chat session
   */
  deleteSession: orgProcedure.input(deleteChatSessionSchema).mutation(async ({ input }) => {
    const { organizationId, chatSessionId } = input;

    // Delete session (messages will cascade delete)
    await db
      .delete(chatSessions)
      .where(
        and(eq(chatSessions.id, chatSessionId), eq(chatSessions.organizationId, organizationId))
      );

    return { success: true };
  }),

  /**
   * Update chat session title
   */
  updateSession: orgProcedure.input(updateChatSessionTitleSchema).mutation(async ({ input }) => {
    const { organizationId, chatSessionId, title } = input;

    await db
      .update(chatSessions)
      .set({ title, updatedAt: new Date() })
      .where(
        and(eq(chatSessions.id, chatSessionId), eq(chatSessions.organizationId, organizationId))
      );

    return { success: true };
  }),
});
