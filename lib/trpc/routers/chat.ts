import { TRPCError } from '@trpc/server';
import { and, asc, desc, eq } from 'drizzle-orm';

import type { GroundingMetadata } from '@/lib/ai/client';
import { generateContent } from '@/lib/ai/client';
import { db } from '@/lib/db/drizzle';
import { chatMessages, chatSessions, documents } from '@/lib/db/schema';
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

import { protectedProcedure, router } from '../init';

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
  listSessions: protectedProcedure.input(listChatSessionsSchema).query(async ({ ctx, input }) => {
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

  getSession: protectedProcedure.input(getSessionSchema).query(async ({ ctx, input }) => {
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

    const session = await db.query.chatSessions.findFirst({
      where: eq(chatSessions.id, input.sessionId),
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
  getMessages: protectedProcedure.input(getMessagesSchema).query(async ({ ctx, input }) => {
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

    // Verify session exists and belongs to organization
    const session = await db.query.chatSessions.findFirst({
      where: and(
        eq(chatSessions.id, input.sessionId),
        eq(chatSessions.organizationId, input.organizationId)
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
      .where(eq(chatMessages.sessionId, input.sessionId))
      .orderBy(asc(chatMessages.createdAt));

    // Get all documents for the organization to match with sources
    const orgDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.organizationId, input.organizationId));

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
  createSession: protectedProcedure
    .input(createChatSessionSchema)
    .mutation(async ({ ctx, input }) => {
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

      // Set title from initial message if provided, otherwise use default
      const title = input.initialMessage
        ? input.initialMessage.slice(0, 50) + (input.initialMessage.length > 50 ? '...' : '')
        : input.title || 'New Chat';

      const [session] = await db
        .insert(chatSessions)
        .values({
          organizationId: input.organizationId,
          userId: ctx.userId,
          title,
        })
        .returning();

      // If initial message provided, save it (but don't wait for AI response)
      if (input.initialMessage) {
        await db.insert(chatMessages).values({
          sessionId: session.id,
          role: 'user',
          content: input.initialMessage,
        });
      }

      return session;
    }),

  /**
   * Delete a chat session
   */
  deleteSession: protectedProcedure
    .input(deleteChatSessionSchema)
    .mutation(async ({ ctx, input }) => {
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

      // Delete session (messages will cascade delete)
      await db
        .delete(chatSessions)
        .where(
          and(
            eq(chatSessions.id, input.sessionId),
            eq(chatSessions.organizationId, input.organizationId)
          )
        );

      return { success: true };
    }),

  /**
   * Update chat session title
   */
  updateSession: protectedProcedure
    .input(updateChatSessionTitleSchema)
    .mutation(async ({ ctx, input }) => {
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

      await db
        .update(chatSessions)
        .set({ title: input.title, updatedAt: new Date() })
        .where(
          and(
            eq(chatSessions.id, input.sessionId),
            eq(chatSessions.organizationId, input.organizationId)
          )
        );

      return { success: true };
    }),

  /**
   * Send a message (save user message only)
   */
  sendMessage: protectedProcedure.input(sendChatMessageSchema).mutation(async ({ ctx, input }) => {
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

    // Verify session exists and belongs to organization
    const session = await db.query.chatSessions.findFirst({
      where: and(
        eq(chatSessions.id, input.sessionId),
        eq(chatSessions.organizationId, input.organizationId)
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
        sessionId: input.sessionId,
        role: 'user',
        content: input.content,
      })
      .returning();

    await db
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, input.sessionId));

    return {
      userMessage,
    };
  }),

  /**
   * Generate AI response for the latest user message in a session
   * Uses organization's documents as context via File Search tool
   */
  generateAIResponse: protectedProcedure
    .input(generateAIResponseSchema)
    .mutation(async ({ ctx, input }) => {
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

      // Get session with messages
      const session = await db.query.chatSessions.findFirst({
        where: and(
          eq(chatSessions.id, input.sessionId),
          eq(chatSessions.organizationId, input.organizationId)
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
        .where(eq(documents.organizationId, input.organizationId))
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
                  fileSearchStoreNames: [fileSearchStoreName],
                },
              },
            ],
          },
        });

        // Save AI response to database with grounding metadata (if available)
        const [assistantMessage] = await db
          .insert(chatMessages)
          .values({
            sessionId: input.sessionId,
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
          .where(eq(chatSessions.id, input.sessionId));

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
