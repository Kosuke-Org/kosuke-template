import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { GroundingMetadata } from '@google/genai';
import * as Sentry from '@sentry/nextjs';
import { UIMessage, convertToModelMessages, streamText } from 'ai';
import { and, eq } from 'drizzle-orm';

import { extractDocumentIdFromFilename, extractRelevantSources } from '@/lib/ai/utils';
import { ApiResponseHandler } from '@/lib/api/responses';
import { auth } from '@/lib/auth/providers';
import { db } from '@/lib/db/drizzle';
import { chatMessages, chatSessions, documents } from '@/lib/db/schema';
import * as llmLogsService from '@/lib/services/llm-logs-service';
import { getRAGSettings } from '@/lib/services/rag-service';
import { chatRequestSchema } from '@/lib/types/chat';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const googleGenerativeAIProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

/**
 * Chat streaming endpoint with RAG (Retrieval-Augmented Generation)
 *
 * Handles:
 * - Authentication and session validation
 * - Request body validation with Zod
 * - Streaming responses with Google Gemini
 * - Message persistence with source metadata
 * - LLM call logging for observability
 * - Error tracking with Sentry
 *
 * @param req - Request with messages array and chat session ID
 * @returns Streaming response with UIMessage format
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user?.id) {
    return ApiResponseHandler.unauthorized();
  }

  let validatedBody;
  try {
    const body = await req.json();
    validatedBody = chatRequestSchema.parse(body);
  } catch (error) {
    return ApiResponseHandler.badRequest(
      error instanceof Error ? error.message : 'Unknown validation error'
    );
  }

  const { messages, id: chatSessionId } = validatedBody;

  // Validate and load session
  const chatSession = await db.query.chatSessions.findFirst({
    where: and(eq(chatSessions.id, chatSessionId), eq(chatSessions.userId, session.user.id)),
  });

  if (!chatSession) {
    return ApiResponseHandler.notFound('Chat session not found');
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
    return ApiResponseHandler.badRequest(
      'No documents available. Please upload documents before chatting with the assistant.'
    );
  }

  const startTime = Date.now();
  const ragSettings = await getRAGSettings(chatSession.organizationId);
  const {
    systemPrompt = null,
    maxOutputTokens = null,
    temperature = null,
    topP = null,
    topK = null,
  } = ragSettings ?? {};

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
    ...(systemPrompt && { system: systemPrompt }),
    ...(maxOutputTokens && { maxOutputTokens }),
    ...(temperature && { temperature }),
    ...(topP && { topP }),
    ...(topK && { topK }),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages as UIMessage[],
    messageMetadata: ({ part }) => {
      // Extract sources from grounding metadata during streaming
      // Sources are automatically attached to message metadata by AI SDK
      if (part.type === 'finish-step' && part.providerMetadata?.google?.groundingMetadata) {
        const metadata = part.providerMetadata.google.groundingMetadata as GroundingMetadata;
        const relevantSources = extractRelevantSources(metadata);

        if (relevantSources.length > 0) {
          // Extract document IDs from filenames (format: {documentId}-{originalName})
          // Generate proxy URLs with organizationId for access control
          const sourcesWithIds = relevantSources
            .map((source) => {
              const documentId = extractDocumentIdFromFilename(source.title);
              if (!documentId) return null;

              return {
                documentId,
                title: source.title.replace(`${documentId}-`, ''), // Remove documentId prefix for display
                url: `/api/documents/${chatSession.organizationId}/${documentId}`,
              };
            })
            .filter((s): s is { documentId: string; title: string; url: string } => s !== null);

          return { sources: sourcesWithIds };
        }
      }

      return undefined;
    },
    async onFinish({ messages: updatedMessages, finishReason }) {
      try {
        // Only save NEW messages (not already in the database)
        // Use existingMessageCount from DB to determine what's new
        // This handles the case where useAIChat optimistically adds messages to local state
        const newMessages = updatedMessages.slice(existingMessageCount);

        if (newMessages.length > 0) {
          // Messages already have metadata attached by messageMetadata callback
          // Just serialize and save to database
          const messagesToInsert = newMessages.map((msg) => ({
            chatSessionId,
            role: msg.role,
            parts: JSON.stringify(msg.parts), // Store UIMessagePart[] array
            metadata: msg.metadata ? JSON.stringify(msg.metadata) : null,
          }));

          await db.insert(chatMessages).values(messagesToInsert);
        }

        // Update session timestamp
        await db
          .update(chatSessions)
          .set({ updatedAt: new Date() })
          .where(eq(chatSessions.id, chatSessionId));

        const usage = await result.totalUsage;
        const request = await result.request;
        console.log('LLM Logs result', JSON.stringify(request, null, 2));

        let generationConfig: string | null = null;
        let actualSystemPrompt: string | null = null;

        try {
          if (typeof request.body === 'string') {
            const requestBody = JSON.parse(request.body);
            if (requestBody.generationConfig) {
              generationConfig = JSON.stringify(requestBody.generationConfig);
            }
            // Extract systemInstruction text from request and store in systemPrompt field
            if (requestBody.systemInstruction?.parts?.[0]?.text) {
              actualSystemPrompt = requestBody.systemInstruction.parts[0].text;
            }
          }
        } catch (error) {
          console.error('Error parsing request body:', error);
        }

        // Log LLM call
        const responseTime = Date.now() - startTime;
        const lastUserMsg = updatedMessages.filter((m) => m.role === 'user').pop();
        const lastAssistantMsg = updatedMessages.filter((m) => m.role === 'assistant').pop();

        await llmLogsService.createLlmLog({
          endpoint: 'chat',
          model: DEFAULT_MODEL,
          systemPrompt: actualSystemPrompt,
          userPrompt: lastUserMsg ? JSON.stringify(lastUserMsg.parts) : null,
          response: lastAssistantMsg ? JSON.stringify(lastAssistantMsg.parts) : null,
          tokensUsed: usage.totalTokens ?? null,
          promptTokens: usage.inputTokens ?? null,
          completionTokens: usage.outputTokens ?? null,
          reasoningTokens: usage.reasoningTokens ?? null,
          cachedInputTokens: usage.cachedInputTokens ?? null,
          responseTimeMs: responseTime,
          finishReason: finishReason,
          generationConfig,
          userId: session.user.id,
          organizationId: chatSession.organizationId,
          chatSessionId: chatSession.id,
        });
      } catch (error) {
        console.error('Error saving messages or logging:', error);

        // Log to Sentry for monitoring and alerting
        Sentry.captureException(error, {
          tags: {
            feature: 'chat',
            operation: 'save_messages',
            chatSessionId: chatSession.id,
            userId: session.user.id,
            organizationId: chatSession.organizationId,
          },
          contexts: {
            chat: {
              chatSessionId: chatSession.id,
              messageCount: updatedMessages.length,
              finishReason,
            },
          },
        });

        // Don't throw - streaming already completed successfully
      }
    },
  });
}
