import { TRPCError } from '@trpc/server';
import { UIDataTypes, UIMessagePart, UITools } from 'ai';
import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { chatMessages, chatSessions } from '@/lib/db/schema';
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
   * Get all messages for a chat session in UIMessage format
   * Sources contain document IDs + proxy URLs for downloads
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

    // Parse messages and return with metadata (sources contain documentId + title + url)
    const messages = rawMessages.map((message) => {
      const parts = JSON.parse(message.parts) as UIMessagePart<UIDataTypes, UITools>[];
      const metadata = message.metadata ? JSON.parse(message.metadata) : undefined;

      return {
        id: message.id,
        role: message.role,
        parts,
        metadata: metadata as
          | {
              sources: { documentId: string; title: string; url: string }[];
            }
          | undefined,
        createdAt: message.createdAt,
      };
    });

    return { messages };
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
