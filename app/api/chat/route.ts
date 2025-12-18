import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { GroundingMetadata } from '@google/genai';
import { UIMessage, convertToModelMessages, streamText } from 'ai';
import { and, eq } from 'drizzle-orm';

import { extractRelevantSources } from '@/lib/ai/utils';
import { auth } from '@/lib/auth/providers';
import { db } from '@/lib/db/drizzle';
import { chatMessages, chatSessions, documents, llmLogs } from '@/lib/db/schema';
import { getPresignedDownloadUrl } from '@/lib/storage';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const googleGenerativeAIProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { messages, id: chatSessionId } = await req.json();

  // Validate and load session
  const chatSession = await db.query.chatSessions.findFirst({
    where: and(eq(chatSessions.id, chatSessionId), eq(chatSessions.userId, session.user.id)),
  });

  if (!chatSession) {
    return new Response('Session not found', { status: 404 });
  }

  // Get existing messages count from database to determine what's new
  const existingMessages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.chatSessionId, chatSessionId));

  const existingMessageCount = existingMessages.length;

  // Get file search store for organization (required for RAG)
  const orgDocs = await db
    .select({ fileSearchStoreName: documents.fileSearchStoreName })
    .from(documents)
    .where(eq(documents.organizationId, chatSession.organizationId))
    .limit(1);

  if (orgDocs.length === 0 || !orgDocs[0].fileSearchStoreName) {
    return new Response(
      'No documents available. Please upload documents before chatting with the assistant.',
      { status: 412 }
    );
  }

  const startTime = Date.now();

  // Collect sources from grounding metadata
  let collectedSources: Array<{ documentId: string; title: string; url: string }> = [];
  let sourcesPromise: Promise<void> | null = null;

  const result = streamText({
    model: googleGenerativeAIProvider(DEFAULT_MODEL),
    messages: convertToModelMessages(messages),
    tools: {
      // @ts-expect-error - Google AI SDK file search tool type incompatibility
      file_search: googleGenerativeAIProvider.tools.fileSearch({
        fileSearchStoreNames: [orgDocs[0].fileSearchStoreName],
      }),
    },
    activeTools: ['file_search'],
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    messageMetadata: async ({ part }) => {
      // Extract sources from Google's grounding metadata
      if (part.type === 'finish-step' && part.providerMetadata?.google?.groundingMetadata) {
        const metadata = part.providerMetadata.google.groundingMetadata as GroundingMetadata;

        // Extract only cited sources
        const relevantSources = extractRelevantSources(metadata);

        if (relevantSources.length === 0) {
          return { sources: [] };
        }

        // Create a promise to track source extraction completion
        sourcesPromise = (async () => {
          // Match sources to actual documents in database and get presigned URLs
          const sourcesWithData = await Promise.all(
            relevantSources.map(async (source) => {
              // Find document by title in the organization
              const doc = await db.query.documents.findFirst({
                where: and(
                  eq(documents.organizationId, chatSession.organizationId),
                  eq(documents.fileSearchStoreName, source.fileSearchStoreName),
                  eq(documents.displayName, source.title)
                ),
              });

              if (!doc) return null;

              const url = doc.storageUrl ? await getPresignedDownloadUrl(doc.storageUrl) : null;

              return {
                documentId: doc.id,
                title: doc.displayName, // Use current displayName from DB (in case it was edited)
                url,
              };
            })
          );

          // Filter out null entries (documents not found) and entries without URLs
          const validSources = sourcesWithData.filter(
            (s): s is { documentId: string; title: string; url: string } =>
              s !== null && s.url !== null
          );

          // Store sources for use in onFinish
          collectedSources = validSources;
        })();

        // Wait for sources to be collected before returning
        await sourcesPromise;

        return { sources: collectedSources };
      }

      // Return collected sources for all other parts (maintains sources across stream)
      return collectedSources.length > 0 ? { sources: collectedSources } : undefined;
    },
    async onFinish({ messages: updatedMessages, finishReason }) {
      try {
        // Wait for sources to be collected if the promise exists
        if (sourcesPromise) {
          await sourcesPromise;
        }

        // Only save NEW messages (not already in the database)
        // Use existingMessageCount from DB to determine what's new
        // This handles the case where useAIChat optimistically adds messages to local state
        const newMessages = updatedMessages.slice(existingMessageCount);

        if (newMessages.length > 0) {
          // Manually attach sources to assistant message metadata
          // Store document IDs and titles (not URLs) - presigned URLs will be generated on retrieval
          const messagesToInsert = newMessages.map((msg: UIMessage) => {
            const metadata =
              msg.role === 'assistant' && collectedSources.length > 0
                ? {
                    sources: collectedSources.map((s) => ({
                      documentId: s.documentId, // Store stable document ID
                      title: s.title, // Store display name for UI
                      // Don't store URL - it will be generated fresh on retrieval
                    })),
                  }
                : msg.metadata || null;

            return {
              chatSessionId,
              role: msg.role,
              parts: JSON.stringify(msg.parts), // Store UIMessagePart[] array
              metadata: metadata ? JSON.stringify(metadata) : null,
            };
          });

          await db.insert(chatMessages).values(messagesToInsert);
        }

        // Update session timestamp
        await db
          .update(chatSessions)
          .set({ updatedAt: new Date() })
          .where(eq(chatSessions.id, chatSessionId));

        // Get usage data from result
        const usage = await result.totalUsage;

        // Log LLM call
        const responseTime = Date.now() - startTime;
        const lastUserMsg = updatedMessages.filter((m) => m.role === 'user').pop();
        const lastAssistantMsg = updatedMessages.filter((m) => m.role === 'assistant').pop();
        const systemPrompt = updatedMessages.filter((m) => m.role === 'system').pop();

        await db.insert(llmLogs).values({
          endpoint: 'chat',
          model: DEFAULT_MODEL,
          systemPrompt: systemPrompt ? JSON.stringify(systemPrompt.parts) : null,
          userPrompt: lastUserMsg ? JSON.stringify(lastUserMsg.parts) : null,
          response: lastAssistantMsg ? JSON.stringify(lastAssistantMsg.parts) : null,
          tokensUsed: usage.totalTokens ?? null,
          promptTokens: usage.inputTokens ?? null,
          completionTokens: usage.outputTokens ?? null,
          reasoningTokens: usage.reasoningTokens ?? null,
          cachedInputTokens: usage.cachedInputTokens ?? null,
          responseTimeMs: responseTime,
          finishReason: finishReason,
          userId: session.user.id,
          organizationId: chatSession.organizationId,
          chatSessionId,
        });
      } catch (error) {
        console.error('Error saving messages or logging:', error);
        // Don't throw - streaming already completed successfully
      }
    },
  });
}
