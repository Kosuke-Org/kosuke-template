import { and, count, eq, ilike, or, sql } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import {
  type LLMLog,
  type NewLLMLog,
  chatSessions,
  llmLogs,
  organizations,
  users,
} from '@/lib/db/schema';

/**
 * LLM log with enriched user and organization data
 */
type LlmLogListItem = Pick<
  LLMLog,
  | 'id'
  | 'timestamp'
  | 'endpoint'
  | 'model'
  | 'tokensUsed'
  | 'promptTokens'
  | 'completionTokens'
  | 'reasoningTokens'
  | 'cachedInputTokens'
  | 'responseTimeMs'
  | 'finishReason'
  | 'errorMessage'
  | 'userId'
  | 'organizationId'
  | 'chatSessionId'
> & {
  userEmail: string | null;
  userDisplayName: string | null;
  organizationName: string | null;
  organizationSlug: string | null;
};

/**
 * Paginated list of LLM logs
 */
interface LlmLogsListResult {
  logs: LlmLogListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Full LLM log details with related entities
 */
interface LlmLogDetails extends LLMLog {
  user: {
    id: string;
    email: string;
    displayName: string;
  } | null;
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
  chatSession: {
    id: string;
    title: string | null;
  } | null;
}

/**
 * List LLM logs with filters and pagination
 */
export async function listLlmLogs(filters: {
  searchQuery?: string;
  organizationId?: string;
  chatSessionId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
  userId?: string;
}): Promise<LlmLogsListResult> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const conditions = [];

  // Search filter (endpoint or model)
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const searchTerm = `%${filters.searchQuery.trim()}%`;
    conditions.push(or(ilike(llmLogs.endpoint, searchTerm), ilike(llmLogs.model, searchTerm)));
  }

  // Organization filter
  if (filters.organizationId) {
    conditions.push(eq(llmLogs.organizationId, filters.organizationId));
  }

  // Chat session filter
  if (filters.chatSessionId) {
    conditions.push(eq(llmLogs.chatSessionId, filters.chatSessionId));
  }

  // Date range filters
  if (filters.dateFrom) {
    conditions.push(sql`${llmLogs.timestamp} >= ${filters.dateFrom}`);
  }

  if (filters.dateTo) {
    conditions.push(sql`${llmLogs.timestamp} <= ${filters.dateTo}`);
  }

  // User filter (for super admin viewing specific user's logs)
  if (filters.userId) {
    conditions.push(eq(llmLogs.userId, filters.userId));
  }

  // Build where clause
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const [{ count: total }] = await db.select({ count: count() }).from(llmLogs).where(whereClause);

  // Get paginated results with joins
  const results = await db
    .select({
      id: llmLogs.id,
      timestamp: llmLogs.timestamp,
      endpoint: llmLogs.endpoint,
      model: llmLogs.model,
      tokensUsed: llmLogs.tokensUsed,
      promptTokens: llmLogs.promptTokens,
      completionTokens: llmLogs.completionTokens,
      reasoningTokens: llmLogs.reasoningTokens,
      cachedInputTokens: llmLogs.cachedInputTokens,
      responseTimeMs: llmLogs.responseTimeMs,
      finishReason: llmLogs.finishReason,
      errorMessage: llmLogs.errorMessage,
      userId: llmLogs.userId,
      organizationId: llmLogs.organizationId,
      chatSessionId: llmLogs.chatSessionId,
      userEmail: users.email,
      userDisplayName: users.displayName,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
    })
    .from(llmLogs)
    .leftJoin(users, eq(llmLogs.userId, users.id))
    .leftJoin(organizations, eq(llmLogs.organizationId, organizations.id))
    .where(whereClause)
    .orderBy(sql`${llmLogs.timestamp} DESC`)
    .limit(pageSize)
    .offset(offset);

  return {
    logs: results,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get single LLM log with full details
 * @throws Error if log not found
 */
export async function getLlmLogById(id: string): Promise<LlmLogDetails> {
  const result = await db
    .select({
      log: llmLogs,
      user: users,
      organization: organizations,
      chatSession: chatSessions,
    })
    .from(llmLogs)
    .leftJoin(users, eq(llmLogs.userId, users.id))
    .leftJoin(organizations, eq(llmLogs.organizationId, organizations.id))
    .leftJoin(chatSessions, eq(llmLogs.chatSessionId, chatSessions.id))
    .where(eq(llmLogs.id, id))
    .limit(1);

  if (result.length === 0) {
    throw new Error('LLM log not found');
  }

  const { log, user, organization, chatSession } = result[0];

  return {
    ...log,
    user: user
      ? {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        }
      : null,
    organization: organization
      ? {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        }
      : null,
    chatSession: chatSession
      ? {
          id: chatSession.id,
          title: chatSession.title,
        }
      : null,
  };
}

/**
 * Create a new LLM log entry
 */
export async function createLlmLog(logData: NewLLMLog): Promise<LLMLog> {
  const [created] = await db.insert(llmLogs).values(logData).returning();

  if (!created) {
    throw new Error('Failed to create LLM log');
  }

  return created;
}
