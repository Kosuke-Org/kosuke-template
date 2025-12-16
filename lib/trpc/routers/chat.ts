import { TRPCError } from '@trpc/server';
import { and, asc, desc, eq } from 'drizzle-orm';

import type { GroundingMetadata } from '@/lib/ai/client';
import { generateContent } from '@/lib/ai/client';
import { db } from '@/lib/db/drizzle';
import { chatMessages, chatSessions, documents } from '@/lib/db/schema';
import { orgProcedure, router } from '@/lib/trpc/init';
import {
  createChatSessionSchema,
  deleteChatSessionSchema,
  generateAIResponseSchema,
  getMessagesSchema,
  getSessionSchema,
  listChatSessionsSchema,
  sendChatMessageSchema,
  updateChatSessionTitleSchema,
} from '@/lib/trpc/schemas/documents';

interface ExtendedRetrievedContext {
  title?: string;
  text?: string;
  uri?: string;
  fileSearchStore?: string;
}

/**
 * Extract relevant sources from grounding metadata
 * Returns only documents that were actually cited in the response
 */
function extractRelevantSources(groundingMetadata: GroundingMetadata) {
  // If no grounding chunks, return empty array
  if (!groundingMetadata.groundingChunks || groundingMetadata.groundingChunks.length === 0) {
    return [];
  }

  // Get indices of chunks that were actually cited in the response
  const citedChunkIndices = new Set(
    (groundingMetadata.groundingSupports || []).flatMap(
      (support) => support.groundingChunkIndices || []
    )
  );

  // If no grounding supports, show all chunks (fallback)
  const relevantChunks =
    citedChunkIndices.size > 0
      ? groundingMetadata.groundingChunks.filter((_, index) => citedChunkIndices.has(index))
      : groundingMetadata.groundingChunks;

  // Deduplicate by document title and extract relevant info
  const uniqueSources = Array.from(
    new Map(
      relevantChunks.map((chunk) => {
        const retrievedContext = chunk.retrievedContext as ExtendedRetrievedContext;
        return [
          retrievedContext?.title,
          {
            title: retrievedContext?.title || '',
            fileSearchStoreName: retrievedContext?.fileSearchStore || '',
          },
        ];
      })
    ).values()
  );

  return uniqueSources.filter((source) => source.title);
}

export const chatRouter = router({
  /**
   * List all chat sessions for an organization
   */
  listSessions: orgProcedure.input(listChatSessionsSchema).query(async ({ input }) => {
    const { page, pageSize, organizationId } = input;
    const offset = (page - 1) * pageSize;

    // Get total count
    const totalResult = await db
      .select({ count: chatSessions.id })
      .from(chatSessions)
      .where(eq(chatSessions.organizationId, organizationId));
    const total = totalResult.length;

    // Get paginated results
    const sessions = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.organizationId, organizationId))
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

  getSession: orgProcedure.input(getSessionSchema).query(async ({ input }) => {
    const { organizationId, chatSessionId } = input;

    const session = await db.query.chatSessions.findFirst({
      where: and(
        eq(chatSessions.id, chatSessionId),
        eq(chatSessions.organizationId, organizationId)
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
   * Get all messages for a chat session
   */
  getMessages: orgProcedure.input(getMessagesSchema).query(async ({ input }) => {
    const { organizationId, chatSessionId } = input;

    // Verify session exists and belongs to organization
    const session = await db.query.chatSessions.findFirst({
      where: and(
        eq(chatSessions.id, chatSessionId),
        eq(chatSessions.organizationId, organizationId)
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
        // Only process messages with grounding metadata
        if (!message.groundingMetadata) {
          return {
            ...message,
            sources: [],
          };
        }

        try {
          const groundingMetadata = JSON.parse(message.groundingMetadata) as GroundingMetadata;
          const relevantSources = extractRelevantSources(groundingMetadata);

          // Match sources with database documents
          const sourcesWithUrls = relevantSources.map((source) => {
            const doc = orgDocuments.find(
              (d) =>
                d.displayName === source.title &&
                d.fileSearchStoreName === source.fileSearchStoreName
            );

            return {
              title: source.title,
              url: doc?.storageUrl || null,
              documentId: doc?.id || null,
            };
          });

          return {
            ...message,
            sources: sourcesWithUrls,
          };
        } catch (error) {
          // If parsing fails, return message without sources
          console.error('Failed to parse grounding metadata:', error);
          return {
            ...message,
            sources: [],
          };
        }
      })
    );

    return { messages: messagesWithSources };
  }),

  /**
   * Create a new chat session (optionally with initial message)
   */
  createSession: orgProcedure.input(createChatSessionSchema).mutation(async ({ ctx, input }) => {
    const { organizationId, title, initialMessage } = input;

    // Set title from initial message if provided, otherwise use default
    const sessionTitle = initialMessage
      ? initialMessage.slice(0, 50) + (initialMessage.length > 50 ? '...' : '')
      : title || 'New Chat';

    const [session] = await db
      .insert(chatSessions)
      .values({
        organizationId,
        userId: ctx.userId,
        title: sessionTitle,
      })
      .returning();

    // If initial message provided, save it (but don't wait for AI response)
    if (initialMessage) {
      await db.insert(chatMessages).values({
        chatSessionId: session.id,
        role: 'user',
        content: initialMessage,
      });
    }

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

  /**
   * Send a message (save user message only)
   */
  sendMessage: orgProcedure.input(sendChatMessageSchema).mutation(async ({ input }) => {
    const { organizationId, chatSessionId, content } = input;

    // Verify session exists and belongs to organization
    const session = await db.query.chatSessions.findFirst({
      where: and(
        eq(chatSessions.id, chatSessionId),
        eq(chatSessions.organizationId, organizationId)
      ),
    });

    if (!session) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Chat session not found',
      });
    }

    const [userMessage] = await db
      .insert(chatMessages)
      .values({
        chatSessionId,
        role: 'user',
        content,
      })
      .returning();

    await db
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, chatSessionId));

    return {
      userMessage,
    };
  }),

  /**
   * Generate AI response for the latest user message in a session
   * Uses organization's documents as context via File Search tool
   */
  generateAIResponse: orgProcedure.input(generateAIResponseSchema).mutation(async ({ input }) => {
    const { organizationId, chatSessionId } = input;

    // Get session with messages
    const session = await db.query.chatSessions.findFirst({
      where: and(
        eq(chatSessions.id, chatSessionId),
        eq(chatSessions.organizationId, organizationId)
      ),
      with: {
        messages: {
          orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        },
      },
    });

    if (!session) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Chat session not found',
      });
    }

    if (session.messages.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No messages in session',
      });
    }

    // Get unique file search store names from organization's documents
    const orgDocuments = await db
      .select({ fileSearchStoreName: documents.fileSearchStoreName })
      .from(documents)
      .where(eq(documents.organizationId, organizationId))
      .limit(1);

    if (orgDocuments.length === 0) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Organization does not have any documents uploaded',
      });
    }

    const fileSearchStoreName = orgDocuments[0].fileSearchStoreName;

    // Build conversation history (all messages, map 'assistant' to 'model' for Gemini API)
    const conversationHistory = session.messages.map((msg) => ({
      role: msg.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: msg.content }],
    }));

    try {
      // Generate AI response with file search
      const aiResponse = await generateContent({
        contents: conversationHistory,
        config: {
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: fileSearchStoreName ? [fileSearchStoreName] : undefined,
              },
            },
          ],
        },
      });

      // Save AI response to database with grounding metadata (if available)
      const [assistantMessage] = await db
        .insert(chatMessages)
        .values({
          chatSessionId,
          role: 'assistant',
          content: aiResponse.text,
          groundingMetadata: aiResponse.groundingMetadata
            ? JSON.stringify(aiResponse.groundingMetadata)
            : null,
        })
        .returning();

      // Update session timestamp
      await db
        .update(chatSessions)
        .set({ updatedAt: new Date() })
        .where(eq(chatSessions.id, chatSessionId));

      return {
        message: assistantMessage,
        groundingMetadata: aiResponse.groundingMetadata,
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate AI response',
      });
    }
  }),
});
