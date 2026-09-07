import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/chat/route';

// Mock Better Auth: the route authenticates through the real REST guards.
vi.mock('@/lib/auth/providers', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    query: {
      chatSessions: { findFirst: vi.fn() },
      orgMemberships: { findFirst: vi.fn() },
    },
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/services/rag-service', () => ({
  getRAGSettings: vi.fn(),
}));

vi.mock('@/lib/services/llm-logs-service', () => ({
  createLlmLog: vi.fn(),
}));

vi.mock('@/lib/ai/utils', () => ({
  extractDocumentIdFromFilename: vi.fn(),
  extractRelevantSources: vi.fn(() => []),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@ai-sdk/google', () => ({
  // AI SDK v7 renamed the provider factory from createGoogleGenerativeAI to createGoogle.
  createGoogle: () =>
    Object.assign(
      vi.fn(() => 'gemini-model'),
      {
        tools: { fileSearch: vi.fn(() => ({})) },
      }
    ),
}));

// AI SDK v7 returns the stream through createUIMessageStreamResponse({ stream: toUIMessageStream(...) })
// rather than result.toUIMessageStreamResponse(). Mock the surface the route actually calls.
vi.mock('ai', () => ({
  convertToModelMessages: vi.fn((messages) => messages),
  toUIMessageStream: vi.fn(() => 'ui-message-stream'),
  createUIMessageStreamResponse: vi.fn(() => new Response('stream', { status: 200 })),
  streamText: vi.fn(() => ({
    totalUsage: Promise.resolve({}),
    request: Promise.resolve({ body: null }),
  })),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyMock = any;

const USER_ID = 'user-1';
const ORG_ID = 'org-1';
const CHAT_SESSION_ID = '11111111-1111-4111-8111-111111111111';

const user = { id: USER_ID, email: 'member@example.com', role: 'user' };

const chatSession = {
  id: CHAT_SESSION_ID,
  userId: USER_ID,
  organizationId: ORG_ID,
  title: 'Existing conversation',
};

const membership = {
  id: 'membership-1',
  organizationId: ORG_ID,
  userId: USER_ID,
  role: 'member',
};

const makeRequest = () =>
  new Request('https://example.com/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: CHAT_SESSION_ID,
      messages: [{ id: 'msg-1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
    }),
  });

/**
 * Drizzle's builder is thenable, and the route awaits it at different points in
 * the chain (`.where(...)` for messages, `.limit(1)` for documents). One
 * chainable stub per queued result covers both shapes.
 */
function queueSelectResults(db: AnyMock, ...results: unknown[][]) {
  const queue = [...results];

  db.select.mockImplementation(() => {
    const result = queue.shift() ?? [];
    const chain: AnyMock = {
      from: () => chain,
      where: () => chain,
      limit: () => chain,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    };
    return chain;
  });
}

describe('POST /api/chat', () => {
  let auth: AnyMock;
  let db: AnyMock;
  let getRAGSettings: AnyMock;
  let streamText: AnyMock;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('GOOGLE_AI_API_KEY', 'test-key');

    ({ auth } = await import('@/lib/auth/providers'));
    ({ db } = await import('@/lib/db/drizzle'));
    ({ getRAGSettings } = await import('@/lib/services/rag-service'));
    ({ streamText } = await import('ai'));
  });

  it('denies with 401 when there is no session', async () => {
    auth.api.getSession.mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(db.query.chatSessions.findFirst).not.toHaveBeenCalled();
  });

  it('denies with 404 when the chat session does not belong to the user', async () => {
    auth.api.getSession.mockResolvedValue({ user });
    db.query.chatSessions.findFirst.mockResolvedValue(undefined);

    const response = await POST(makeRequest());

    expect(response.status).toBe(404);
    expect(db.query.orgMemberships.findFirst).not.toHaveBeenCalled();
  });

  it('denies with 403 when the membership was deleted after the chat session was created', async () => {
    auth.api.getSession.mockResolvedValue({ user });
    db.query.chatSessions.findFirst.mockResolvedValue(chatSession);
    // The user was removed from the organization; the chat session row survives.
    db.query.orgMemberships.findFirst.mockResolvedValue(undefined);

    const response = await POST(makeRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'You do not have access to this organization',
      code: 'FORBIDDEN',
    });

    // Nothing org-scoped may be touched once membership is gone.
    expect(db.select).not.toHaveBeenCalled();
    expect(getRAGSettings).not.toHaveBeenCalled();
    expect(streamText).not.toHaveBeenCalled();
  });

  it('scopes the membership lookup to the chat session organization and the caller', async () => {
    auth.api.getSession.mockResolvedValue({ user });
    db.query.chatSessions.findFirst.mockResolvedValue(chatSession);
    db.query.orgMemberships.findFirst.mockResolvedValue(undefined);

    await POST(makeRequest());

    const conditions: Array<[string, unknown]> = [];
    const table = new Proxy({}, { get: (_target, prop) => String(prop) });
    const { where } = db.query.orgMemberships.findFirst.mock.calls[0][0];
    where(table, {
      and: (...args: unknown[]) => args,
      eq: (column: string, value: unknown) => conditions.push([column, value]),
    });

    expect(conditions).toEqual([
      ['organizationId', ORG_ID],
      ['userId', USER_ID],
    ]);
  });

  it('streams a response for a member who still belongs to the organization', async () => {
    auth.api.getSession.mockResolvedValue({ user });
    db.query.chatSessions.findFirst.mockResolvedValue(chatSession);
    db.query.orgMemberships.findFirst.mockResolvedValue(membership);
    queueSelectResults(db, [], [{ fileSearchStoreName: 'stores/org-1' }]);
    getRAGSettings.mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(getRAGSettings).toHaveBeenCalledWith(ORG_ID);
    expect(streamText).toHaveBeenCalledTimes(1);
  });

  it('resolves the session once for the user and membership checks', async () => {
    auth.api.getSession.mockResolvedValue({ user });
    db.query.chatSessions.findFirst.mockResolvedValue(chatSession);
    db.query.orgMemberships.findFirst.mockResolvedValue(membership);
    queueSelectResults(db, [], [{ fileSearchStoreName: 'stores/org-1' }]);
    getRAGSettings.mockResolvedValue(null);

    await POST(makeRequest());

    expect(auth.api.getSession).toHaveBeenCalledTimes(1);
    expect(auth.api.getSession).toHaveBeenCalledWith(
      expect.objectContaining({ query: { disableCookieCache: true } })
    );
  });
});
