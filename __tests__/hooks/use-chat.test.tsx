import { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { trpc } from '@/lib/trpc/client';

import { useChat, useChatSession } from '@/hooks/use-chat';

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
    dismiss: vi.fn(),
  }),
}));

const mockInvalidate = vi.fn();
vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    chat: {
      listSessions: {
        useQuery: vi.fn(),
      },
      createSession: {
        useMutation: vi.fn(),
      },
      deleteSession: {
        useMutation: vi.fn(),
      },
      updateSession: {
        useMutation: vi.fn(),
      },
      getMessages: {
        useQuery: vi.fn(),
      },
    },
    useUtils: () => ({
      chat: {
        listSessions: {
          invalidate: mockInvalidate,
        },
        getMessages: {
          invalidate: mockInvalidate,
        },
      },
    }),
  },
}));

// Mock AI SDK's useChat hook
vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn(() => ({
    messages: [],
    sendMessage: vi.fn(),
    regenerate: vi.fn(),
    status: 'idle',
    setMessages: vi.fn(),
  })),
}));

describe('useChatSession', () => {
  let queryClient: QueryClient;

  const mockSessions = [
    {
      id: 'session_1',
      organizationId: 'org_123',
      title: 'Technical Discussion',
      createdAt: new Date('2025-01-15'),
      updatedAt: new Date('2025-01-15'),
    },
    {
      id: 'session_2',
      organizationId: 'org_123',
      title: 'Product Planning',
      createdAt: new Date('2025-01-20'),
      updatedAt: new Date('2025-01-20'),
    },
  ];

  const mockSessionsData = {
    sessions: mockSessions,
    total: 2,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  };

  const defaultOptions = {
    organizationId: 'org_123',
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();

    // Setup default query mocks
    (trpc.chat.listSessions.useQuery as Mock).mockReturnValue({
      data: mockSessionsData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    // Setup default mutation mocks
    (trpc.chat.createSession.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.chat.deleteSession.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.chat.updateSession.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should fetch chat sessions successfully', async () => {
    const { result } = renderHook(() => useChatSession(defaultOptions), { wrapper });

    await waitFor(() => {
      expect(result.current.sessions).toEqual(mockSessions);
      expect(result.current.isLoadingSessions).toBe(false);
    });
  });

  it('should create session successfully', async () => {
    const mockNewSession = {
      id: 'session_new',
      organizationId: 'org_123',
      title: 'New Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockMutateAsync = vi.fn().mockImplementation(() => {
      const options = (trpc.chat.createSession.useMutation as Mock).mock.calls[0][0];
      options.onSuccess();
      return mockNewSession;
    });

    (trpc.chat.createSession.useMutation as Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    const { result } = renderHook(() => useChatSession(defaultOptions), { wrapper });

    const newSession = await result.current.createSession({
      title: 'New Chat',
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      organizationId: 'org_123',
      title: 'New Chat',
    });

    expect(newSession).toEqual(mockNewSession);
    expect(mockInvalidate).toHaveBeenCalled();
  });

  it('should show destructive toast on create session error', async () => {
    (trpc.chat.createSession.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn().mockImplementation(() => {
        const options = (trpc.chat.createSession.useMutation as Mock).mock.calls[0][0];
        options.onError(new Error('Failed to create session'));
      }),
      isPending: false,
    });

    const { result } = renderHook(() => useChatSession(defaultOptions), { wrapper });

    await result.current.createSession({ title: 'New Chat' });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Failed to create session',
      variant: 'destructive',
    });
  });

  it('should delete session successfully', async () => {
    const mockMutateAsync = vi.fn().mockImplementation(() => {
      const options = (trpc.chat.deleteSession.useMutation as Mock).mock.calls[0][0];
      options.onSuccess();
    });

    (trpc.chat.deleteSession.useMutation as Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    const { result } = renderHook(() => useChatSession(defaultOptions), { wrapper });

    await result.current.deleteSession('session_1');

    expect(mockMutateAsync).toHaveBeenCalledWith({
      chatSessionId: 'session_1',
      organizationId: 'org_123',
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Chat session deleted',
    });
    expect(mockInvalidate).toHaveBeenCalled();
  });

  it('should show destructive toast on delete session error', async () => {
    (trpc.chat.deleteSession.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn().mockImplementation(() => {
        const options = (trpc.chat.deleteSession.useMutation as Mock).mock.calls[0][0];
        options.onError(new Error('Failed to delete session'));
      }),
      isPending: false,
    });

    const { result } = renderHook(() => useChatSession(defaultOptions), { wrapper });

    await result.current.deleteSession('session_1');

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Failed to delete session',
      variant: 'destructive',
    });
  });

  it('should update chat session successfully', async () => {
    const mockMutateAsync = vi.fn().mockImplementation(() => {
      const options = (trpc.chat.updateSession.useMutation as Mock).mock.calls[0][0];
      options.onSuccess();
    });

    (trpc.chat.updateSession.useMutation as Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    const { result } = renderHook(() => useChatSession(defaultOptions), { wrapper });

    await result.current.updateChatSession('session_1', 'Updated Title');

    expect(mockMutateAsync).toHaveBeenCalledWith({
      chatSessionId: 'session_1',
      organizationId: 'org_123',
      title: 'Updated Title',
    });

    expect(mockInvalidate).toHaveBeenCalled();
  });

  it('should show destructive toast on update session error', async () => {
    (trpc.chat.updateSession.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn().mockImplementation(() => {
        const options = (trpc.chat.updateSession.useMutation as Mock).mock.calls[0][0];
        options.onError(new Error('Failed to update session'));
      }),
      isPending: false,
    });

    const { result } = renderHook(() => useChatSession(defaultOptions), { wrapper });

    await result.current.updateChatSession('session_1', 'Updated Title');

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Failed to update session',
      variant: 'destructive',
    });
  });

  it('should not fetch sessions when organizationId is missing', () => {
    const invalidOptions = {
      organizationId: '',
    };

    (trpc.chat.listSessions.useQuery as Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useChatSession(invalidOptions), { wrapper });

    expect(trpc.chat.listSessions.useQuery).toHaveBeenCalledWith(
      {
        organizationId: '',
        page: 1,
        pageSize: 50,
      },
      expect.objectContaining({
        enabled: false,
      })
    );

    expect(result.current.sessions).toEqual([]);
  });
});

describe('useChat', () => {
  let queryClient: QueryClient;

  const mockMessages = [
    {
      id: 'msg_1',
      chatSessionId: 'session_1',
      role: 'user' as const,
      content: 'What is the status?',
      createdAt: new Date('2025-01-15T10:00:00'),
      groundingMetadata: null,
      sources: [],
    },
    {
      id: 'msg_2',
      chatSessionId: 'session_1',
      role: 'assistant' as const,
      content: 'The project is on track.',
      createdAt: new Date('2025-01-15T10:01:00'),
      groundingMetadata: null,
      sources: [],
    },
  ];

  const mockMessagesData = {
    messages: mockMessages,
  };

  const defaultSessionOptions = {
    chatSessionId: 'session_1',
    organizationId: 'org_123',
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();

    // Setup default query mocks
    (trpc.chat.getMessages.useQuery as Mock).mockReturnValue({
      data: mockMessagesData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should initialize with empty messages and not loading', () => {
    const { result } = renderHook(() => useChat(defaultSessionOptions), { wrapper });

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle input changes', async () => {
    const { result } = renderHook(() => useChat(defaultSessionOptions), { wrapper });

    const mockEvent = {
      target: { value: 'Hello, AI!' },
    } as React.ChangeEvent<HTMLTextAreaElement>;

    result.current.handleInputChange(mockEvent);

    await waitFor(() => {
      expect(result.current.input).toEqual('Hello, AI!');
    });
  });

  it('should not fetch messages when chatSessionId is missing', () => {
    const invalidOptions = {
      chatSessionId: '',
      organizationId: 'org_123',
    };

    (trpc.chat.getMessages.useQuery as Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useChat(invalidOptions), { wrapper });

    expect(trpc.chat.getMessages.useQuery).toHaveBeenCalledWith(
      {
        chatSessionId: '',
        organizationId: 'org_123',
      },
      expect.objectContaining({
        enabled: false,
      })
    );

    expect(result.current.messages).toEqual([]);
  });

  it('should not fetch messages when organizationId is missing', () => {
    const invalidOptions = {
      chatSessionId: 'session_1',
      organizationId: '',
    };

    (trpc.chat.getMessages.useQuery as Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useChat(invalidOptions), { wrapper });

    expect(trpc.chat.getMessages.useQuery).toHaveBeenCalledWith(
      {
        chatSessionId: 'session_1',
        organizationId: '',
      },
      expect.objectContaining({
        enabled: false,
      })
    );

    expect(result.current.messages).toEqual([]);
  });
});
