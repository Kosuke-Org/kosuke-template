import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockTRPCContext } from '@/__tests__/setup/mocks';
import { expectTRPCError } from '@/__tests__/setup/utils';

import { db } from '@/lib/db/drizzle';
import { createCaller } from '@/lib/trpc/server';

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    query: {
      orgMemberships: { findFirst: vi.fn() },
      chatSessions: { findFirst: vi.fn() },
    },
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Chat Router', () => {
  const userId = 'user_123';
  const organizationId = '22222222-2222-4222-8222-222222222222';
  const otherOrganizationId = '33333333-3333-4333-8333-333333333333';
  const chatSessionId = '44444444-4444-4444-8444-444444444444';

  const mockSession = {
    id: chatSessionId,
    organizationId,
    userId,
    title: 'Quarterly review',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  };

  const membership = {
    id: 'membership_1',
    organizationId,
    userId,
    role: 'member' as const,
    createdAt: new Date('2026-01-01'),
  };

  const memberCaller = () => createCaller(createMockTRPCContext({ userId }));
  const anonCaller = () => createCaller(createMockTRPCContext({ userId: null }));

  /** db.select({ count }).from().where() -> rows */
  const mockCountQuery = (rows: unknown[]) => ({
    from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(rows) }),
  });

  /** db.select().from().where().orderBy().limit().offset() -> rows */
  const mockPaginatedQuery = (rows: unknown[]) => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ offset: vi.fn().mockResolvedValue(rows) }),
        }),
      }),
    }),
  });

  /** db.select().from().where().orderBy() -> rows */
  const mockOrderedQuery = (rows: unknown[]) => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue(rows) }),
    }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.query.orgMemberships.findFirst).mockResolvedValue(membership);
  });

  describe('orgProcedure authorization', () => {
    it('rejects an unauthenticated caller', async () => {
      const caller = await anonCaller();

      await expectTRPCError(caller.chat.listSessions({ organizationId }), 'UNAUTHORIZED');
      expect(db.query.orgMemberships.findFirst).not.toHaveBeenCalled();
    });

    it('rejects a caller with no membership in the requested organization', async () => {
      vi.mocked(db.query.orgMemberships.findFirst).mockResolvedValue(undefined);

      const caller = await memberCaller();

      await expectTRPCError(
        caller.chat.listSessions({ organizationId: otherOrganizationId }),
        'FORBIDDEN',
        'do not have access to this organization'
      );
      expect(db.select).not.toHaveBeenCalled();
    });
  });

  describe('listSessions', () => {
    it('returns the caller own sessions with pagination metadata', async () => {
      vi.mocked(db.select)
        .mockReturnValueOnce(mockCountQuery([{ count: 3 }]) as never)
        .mockReturnValueOnce(mockPaginatedQuery([mockSession]) as never);

      const caller = await memberCaller();
      const result = await caller.chat.listSessions({ organizationId, page: 2, pageSize: 2 });

      expect(result).toEqual({
        sessions: [mockSession],
        total: 3,
        page: 2,
        pageSize: 2,
        totalPages: 2,
      });
    });

    it('applies the schema defaults when page and pageSize are omitted', async () => {
      vi.mocked(db.select)
        .mockReturnValueOnce(mockCountQuery([{ count: 0 }]) as never)
        .mockReturnValueOnce(mockPaginatedQuery([]) as never);

      const caller = await memberCaller();
      const result = await caller.chat.listSessions({ organizationId });

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(0);
    });

    it('rejects a pageSize above the 100 maximum', async () => {
      const caller = await memberCaller();

      await expectTRPCError(
        caller.chat.listSessions({ organizationId, pageSize: 101 }),
        'BAD_REQUEST'
      );
      expect(db.select).not.toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('returns a session owned by the caller', async () => {
      vi.mocked(db.query.chatSessions.findFirst).mockResolvedValue(mockSession as never);

      const caller = await memberCaller();
      const result = await caller.chat.getSession({ organizationId, chatSessionId });

      expect(result).toEqual(mockSession);
    });

    it('returns NOT_FOUND for a session belonging to another member', async () => {
      // The query filters on userId too, so another member's session simply does not resolve.
      vi.mocked(db.query.chatSessions.findFirst).mockResolvedValue(undefined);

      const caller = await memberCaller();

      await expectTRPCError(
        caller.chat.getSession({ organizationId, chatSessionId }),
        'NOT_FOUND',
        'Chat session not found'
      );
    });

    it('rejects a non-uuid chatSessionId', async () => {
      const caller = await memberCaller();

      await expectTRPCError(
        caller.chat.getSession({ organizationId, chatSessionId: 'nope' }),
        'BAD_REQUEST'
      );
      expect(db.query.chatSessions.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('getMessages', () => {
    it('parses stored parts and metadata into UI messages', async () => {
      vi.mocked(db.query.chatSessions.findFirst).mockResolvedValue(mockSession as never);
      vi.mocked(db.select).mockReturnValueOnce(
        mockOrderedQuery([
          {
            id: 'message_1',
            role: 'assistant',
            parts: JSON.stringify([{ type: 'text', text: 'Hello' }]),
            metadata: JSON.stringify({
              sources: [{ documentId: 'doc_1', title: 'Report', url: '/api/documents/doc_1' }],
            }),
            createdAt: new Date('2026-01-03'),
          },
        ]) as never
      );

      const caller = await memberCaller();
      const result = await caller.chat.getMessages({ organizationId, chatSessionId });

      expect(result.messages).toEqual([
        {
          id: 'message_1',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hello' }],
          metadata: {
            sources: [{ documentId: 'doc_1', title: 'Report', url: '/api/documents/doc_1' }],
          },
          createdAt: new Date('2026-01-03'),
        },
      ]);
    });

    it('leaves metadata undefined when the row has none', async () => {
      vi.mocked(db.query.chatSessions.findFirst).mockResolvedValue(mockSession as never);
      vi.mocked(db.select).mockReturnValueOnce(
        mockOrderedQuery([
          {
            id: 'message_1',
            role: 'user',
            parts: JSON.stringify([{ type: 'text', text: 'Hi' }]),
            metadata: null,
            createdAt: new Date('2026-01-03'),
          },
        ]) as never
      );

      const caller = await memberCaller();
      const result = await caller.chat.getMessages({ organizationId, chatSessionId });

      expect(result.messages[0].metadata).toBeUndefined();
    });

    it('returns NOT_FOUND without reading messages when the session does not resolve', async () => {
      vi.mocked(db.query.chatSessions.findFirst).mockResolvedValue(undefined);

      const caller = await memberCaller();

      await expectTRPCError(
        caller.chat.getMessages({ organizationId, chatSessionId }),
        'NOT_FOUND',
        'Chat session not found'
      );
      expect(db.select).not.toHaveBeenCalled();
    });

    it('fails with INTERNAL_SERVER_ERROR when stored parts are not valid JSON', async () => {
      vi.mocked(db.query.chatSessions.findFirst).mockResolvedValue(mockSession as never);
      vi.mocked(db.select).mockReturnValueOnce(
        mockOrderedQuery([
          {
            id: 'message_1',
            role: 'assistant',
            parts: '{not json',
            metadata: null,
            createdAt: new Date('2026-01-03'),
          },
        ]) as never
      );

      const caller = await memberCaller();

      await expectTRPCError(
        caller.chat.getMessages({ organizationId, chatSessionId }),
        'INTERNAL_SERVER_ERROR',
        'Failed to parse message data'
      );
    });

    it('fails with INTERNAL_SERVER_ERROR when metadata does not match the source schema', async () => {
      vi.mocked(db.query.chatSessions.findFirst).mockResolvedValue(mockSession as never);
      vi.mocked(db.select).mockReturnValueOnce(
        mockOrderedQuery([
          {
            id: 'message_1',
            role: 'assistant',
            parts: JSON.stringify([{ type: 'text', text: 'Hello' }]),
            metadata: JSON.stringify({ sources: [{ documentId: 'doc_1' }] }),
            createdAt: new Date('2026-01-03'),
          },
        ]) as never
      );

      const caller = await memberCaller();

      await expectTRPCError(
        caller.chat.getMessages({ organizationId, chatSessionId }),
        'INTERNAL_SERVER_ERROR',
        'Failed to parse message data'
      );
    });
  });

  describe('createSession', () => {
    it('creates a session owned by the caller in the requested organization', async () => {
      const valuesSpy = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockSession]),
      });
      vi.mocked(db.insert).mockReturnValue({ values: valuesSpy } as never);

      const caller = await memberCaller();
      const result = await caller.chat.createSession({ organizationId, title: 'Quarterly review' });

      expect(result).toEqual(mockSession);
      expect(valuesSpy).toHaveBeenCalledWith({
        organizationId,
        userId,
        title: 'Quarterly review',
      });
    });

    it('defaults the title to "New Chat"', async () => {
      const valuesSpy = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ ...mockSession, title: 'New Chat' }]),
      });
      vi.mocked(db.insert).mockReturnValue({ values: valuesSpy } as never);

      const caller = await memberCaller();
      await caller.chat.createSession({ organizationId });

      expect(valuesSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Chat' }));
    });

    it('rejects an empty title', async () => {
      const caller = await memberCaller();

      await expectTRPCError(
        caller.chat.createSession({ organizationId, title: '' }),
        'BAD_REQUEST'
      );
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('rejects a non-member', async () => {
      vi.mocked(db.query.orgMemberships.findFirst).mockResolvedValue(undefined);

      const caller = await memberCaller();

      await expectTRPCError(caller.chat.createSession({ organizationId }), 'FORBIDDEN');
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('deleteSession', () => {
    it('deletes the session and reports success', async () => {
      const whereSpy = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: whereSpy } as never);

      const caller = await memberCaller();
      const result = await caller.chat.deleteSession({ organizationId, chatSessionId });

      expect(result).toEqual({ success: true });
      expect(whereSpy).toHaveBeenCalledTimes(1);
    });

    it('reports success even when the session does not exist', async () => {
      // Documents current behavior: the delete is not preceded by an existence check.
      const whereSpy = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: whereSpy } as never);

      const caller = await memberCaller();

      await expect(caller.chat.deleteSession({ organizationId, chatSessionId })).resolves.toEqual({
        success: true,
      });
      expect(db.query.chatSessions.findFirst).not.toHaveBeenCalled();
    });

    it('rejects a non-member', async () => {
      vi.mocked(db.query.orgMemberships.findFirst).mockResolvedValue(undefined);

      const caller = await memberCaller();

      await expectTRPCError(
        caller.chat.deleteSession({ organizationId, chatSessionId }),
        'FORBIDDEN'
      );
      expect(db.delete).not.toHaveBeenCalled();
    });
  });

  describe('updateSession', () => {
    it('renames the session and bumps updatedAt', async () => {
      const setSpy = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
      vi.mocked(db.update).mockReturnValue({ set: setSpy } as never);

      const caller = await memberCaller();
      const result = await caller.chat.updateSession({
        organizationId,
        chatSessionId,
        title: 'Renamed',
      });

      expect(result).toEqual({ success: true });
      expect(setSpy).toHaveBeenCalledWith({ title: 'Renamed', updatedAt: expect.any(Date) });
    });

    it('rejects a title longer than 255 characters', async () => {
      const caller = await memberCaller();

      await expectTRPCError(
        caller.chat.updateSession({ organizationId, chatSessionId, title: 'x'.repeat(256) }),
        'BAD_REQUEST'
      );
      expect(db.update).not.toHaveBeenCalled();
    });

    it('rejects an unauthenticated caller', async () => {
      const caller = await anonCaller();

      await expectTRPCError(
        caller.chat.updateSession({ organizationId, chatSessionId, title: 'Renamed' }),
        'UNAUTHORIZED'
      );
      expect(db.update).not.toHaveBeenCalled();
    });
  });
});
