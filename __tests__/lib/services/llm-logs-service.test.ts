/**
 * LLM Logs Service Tests
 * Tests for LLM logging and retrieval operations
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db/drizzle';
import * as llmLogsService from '@/lib/services/llm-logs-service';

// Mock the database
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('LLM Logs Service', () => {
  const mockUserId = 'user-123';
  const mockOrgId = 'org-456';
  const mockChatSessionId = 'session-789';
  const mockLogId = 'log-abc';

  const mockLlmLog = {
    id: mockLogId,
    timestamp: new Date('2024-01-15T10:30:00Z'),
    endpoint: 'chat',
    model: 'gemini-2.5-flash',
    systemPrompt: 'You are a helpful assistant',
    userPrompt: '[{"type":"text","text":"Hello"}]',
    response: '[{"type":"text","text":"Hi there!"}]',
    tokensUsed: 150,
    promptTokens: 50,
    completionTokens: 100,
    reasoningTokens: 0,
    cachedInputTokens: 0,
    responseTimeMs: 1500,
    finishReason: 'stop',
    errorMessage: null,
    generationConfig: '{"temperature":0.7}',
    userId: mockUserId,
    organizationId: mockOrgId,
    chatSessionId: mockChatSessionId,
    createdAt: new Date('2024-01-15T10:30:00Z'),
  };

  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    displayName: 'Test User',
    emailVerified: true,
    profileImageUrl: null,
    stripeCustomerId: null,
    notificationSettings: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    role: 'user',
    banned: false,
    banReason: null,
    banExpires: null,
  };

  const mockOrganization = {
    id: mockOrgId,
    name: 'Test Organization',
    slug: 'test-org',
    logoUrl: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockChatSession = {
    id: mockChatSessionId,
    title: 'Test Chat Session',
    userId: mockUserId,
    organizationId: mockOrgId,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('listLlmLogs', () => {
    it('should return paginated logs with default pagination', async () => {
      const mockLogs = [
        {
          id: mockLogId,
          timestamp: mockLlmLog.timestamp,
          endpoint: mockLlmLog.endpoint,
          model: mockLlmLog.model,
          tokensUsed: mockLlmLog.tokensUsed,
          promptTokens: mockLlmLog.promptTokens,
          completionTokens: mockLlmLog.completionTokens,
          reasoningTokens: mockLlmLog.reasoningTokens,
          cachedInputTokens: mockLlmLog.cachedInputTokens,
          responseTimeMs: mockLlmLog.responseTimeMs,
          finishReason: mockLlmLog.finishReason,
          errorMessage: mockLlmLog.errorMessage,
          userId: mockUserId,
          organizationId: mockOrgId,
          chatSessionId: mockChatSessionId,
          userEmail: mockUser.email,
          userDisplayName: mockUser.displayName,
          organizationName: mockOrganization.name,
          organizationSlug: mockOrganization.slug,
        },
      ];

      // Mock count query
      const mockCountSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });

      // Mock list query
      const mockListSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockLogs),
              }),
            }),
          }),
        }),
      });

      vi.mocked(db.select)
        .mockImplementationOnce(mockCountSelect)
        .mockImplementationOnce(mockListSelect);

      const result = await llmLogsService.listLlmLogs({});

      expect(result).toEqual({
        logs: mockLogs,
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });
      expect(db.select).toHaveBeenCalledTimes(2);
    });

    it('should filter logs by search query', async () => {
      const mockCountSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      const mockListSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      vi.mocked(db.select)
        .mockImplementationOnce(mockCountSelect)
        .mockImplementationOnce(mockListSelect);

      const result = await llmLogsService.listLlmLogs({
        searchQuery: 'gemini',
      });

      expect(result.logs).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should filter logs by organizationId', async () => {
      const mockCountSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });

      const mockListSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      vi.mocked(db.select)
        .mockImplementationOnce(mockCountSelect)
        .mockImplementationOnce(mockListSelect);

      await llmLogsService.listLlmLogs({
        organizationId: mockOrgId,
      });

      expect(db.select).toHaveBeenCalledTimes(2);
    });

    it('should filter logs by chatSessionId', async () => {
      const mockCountSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });

      const mockListSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      vi.mocked(db.select)
        .mockImplementationOnce(mockCountSelect)
        .mockImplementationOnce(mockListSelect);

      await llmLogsService.listLlmLogs({
        chatSessionId: mockChatSessionId,
      });

      expect(db.select).toHaveBeenCalledTimes(2);
    });

    it('should filter logs by date range', async () => {
      const mockCountSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });

      const mockListSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      vi.mocked(db.select)
        .mockImplementationOnce(mockCountSelect)
        .mockImplementationOnce(mockListSelect);

      await llmLogsService.listLlmLogs({
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
      });

      expect(db.select).toHaveBeenCalledTimes(2);
    });

    it('should filter logs by userId', async () => {
      const mockCountSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });

      const mockListSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      vi.mocked(db.select)
        .mockImplementationOnce(mockCountSelect)
        .mockImplementationOnce(mockListSelect);

      await llmLogsService.listLlmLogs({
        userId: mockUserId,
      });

      expect(db.select).toHaveBeenCalledTimes(2);
    });

    it('should handle custom pagination', async () => {
      const mockCountSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 100 }]),
        }),
      });

      const mockListSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      vi.mocked(db.select)
        .mockImplementationOnce(mockCountSelect)
        .mockImplementationOnce(mockListSelect);

      const result = await llmLogsService.listLlmLogs({
        page: 2,
        pageSize: 10,
      });

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(10);
    });
  });

  describe('getLlmLogById', () => {
    it('should return log with full details when found', async () => {
      const mockResult = [
        {
          log: mockLlmLog,
          user: mockUser,
          organization: mockOrganization,
          chatSession: mockChatSession,
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockResult),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await llmLogsService.getLlmLogById(mockLogId);

      expect(result).toEqual({
        ...mockLlmLog,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          displayName: mockUser.displayName,
        },
        organization: {
          id: mockOrganization.id,
          name: mockOrganization.name,
          slug: mockOrganization.slug,
        },
        chatSession: {
          id: mockChatSession.id,
          title: mockChatSession.title,
        },
      });
      expect(db.select).toHaveBeenCalled();
    });

    it('should return log with null relations when not found', async () => {
      const mockResult = [
        {
          log: mockLlmLog,
          user: null,
          organization: null,
          chatSession: null,
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockResult),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await llmLogsService.getLlmLogById(mockLogId);

      expect(result.user).toBeNull();
      expect(result.organization).toBeNull();
      expect(result.chatSession).toBeNull();
    });

    it('should throw error when log not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(llmLogsService.getLlmLogById('non-existent')).rejects.toThrow(
        'LLM log not found'
      );
    });
  });

  describe('createLlmLog', () => {
    it('should create a new LLM log', async () => {
      const newLogData = {
        endpoint: 'chat',
        model: 'gemini-2.5-flash',
        systemPrompt: 'You are a helpful assistant',
        userPrompt: '[{"type":"text","text":"Hello"}]',
        response: '[{"type":"text","text":"Hi there!"}]',
        tokensUsed: 150,
        promptTokens: 50,
        completionTokens: 100,
        reasoningTokens: 0,
        cachedInputTokens: 0,
        responseTimeMs: 1500,
        finishReason: 'stop',
        errorMessage: null,
        generationConfig: '{"temperature":0.7}',
        userId: mockUserId,
        organizationId: mockOrgId,
        chatSessionId: mockChatSessionId,
      };

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockLlmLog]),
        }),
      });

      vi.mocked(db.insert).mockImplementation(mockInsert);

      const result = await llmLogsService.createLlmLog(newLogData);

      expect(result).toEqual(mockLlmLog);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should throw error when creation fails', async () => {
      const newLogData = {
        endpoint: 'chat',
        model: 'gemini-2.5-flash',
        systemPrompt: null,
        userPrompt: null,
        response: null,
        tokensUsed: null,
        promptTokens: null,
        completionTokens: null,
        reasoningTokens: null,
        cachedInputTokens: null,
        responseTimeMs: null,
        finishReason: null,
        errorMessage: null,
        generationConfig: null,
        userId: mockUserId,
        organizationId: mockOrgId,
        chatSessionId: mockChatSessionId,
      };

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(db.insert).mockImplementation(mockInsert);

      await expect(llmLogsService.createLlmLog(newLogData)).rejects.toThrow(
        'Failed to create LLM log'
      );
    });

    it('should create log with null optional fields', async () => {
      const minimalLogData = {
        endpoint: 'chat',
        model: 'gemini-2.5-flash',
        systemPrompt: null,
        userPrompt: null,
        response: null,
        tokensUsed: null,
        promptTokens: null,
        completionTokens: null,
        reasoningTokens: null,
        cachedInputTokens: null,
        responseTimeMs: null,
        finishReason: null,
        errorMessage: null,
        generationConfig: null,
        userId: mockUserId,
        organizationId: mockOrgId,
        chatSessionId: mockChatSessionId,
      };

      const mockCreatedLog = {
        ...mockLlmLog,
        systemPrompt: null,
        userPrompt: null,
        response: null,
        tokensUsed: null,
        promptTokens: null,
        completionTokens: null,
        reasoningTokens: null,
        cachedInputTokens: null,
        responseTimeMs: null,
        finishReason: null,
        generationConfig: null,
      };

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockCreatedLog]),
        }),
      });

      vi.mocked(db.insert).mockImplementation(mockInsert);

      const result = await llmLogsService.createLlmLog(minimalLogData);

      expect(result).toEqual(mockCreatedLog);
      expect(result.systemPrompt).toBeNull();
      expect(result.tokensUsed).toBeNull();
    });
  });
});
