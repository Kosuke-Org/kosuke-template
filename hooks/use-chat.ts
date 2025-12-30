'use client';

import { useEffect, useState } from 'react';

import { useChat as useAIChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

import { trpc } from '@/lib/trpc/client';

import { useToast } from '@/hooks/use-toast';

import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';

interface UseChatSessionOptions {
  organizationId: string;
}

interface UseChatOptions {
  chatSessionId: string;
  organizationId: string;
}

export function useChatSession(options: UseChatSessionOptions) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const sessionsQuery = trpc.chat.listSessions.useQuery(
    {
      organizationId: options.organizationId,
      page: 1,
      pageSize: 50,
    },
    {
      staleTime: 1000 * 60 * 2, // 2 minutes
      enabled: !!options.organizationId,
    }
  );

  const createSessionMutation = trpc.chat.createSession.useMutation({
    onSuccess: () => {
      utils.chat.listSessions.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteSessionMutation = trpc.chat.deleteSession.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Chat session deleted',
      });
      utils.chat.listSessions.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateSessionMutation = trpc.chat.updateSession.useMutation({
    onSuccess: () => {
      utils.chat.listSessions.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createSession = async ({ title }: { title?: string }) => {
    return createSessionMutation.mutateAsync({
      organizationId: options.organizationId,
      title,
    });
  };

  const deleteSession = async (chatSessionId: string) => {
    await deleteSessionMutation.mutateAsync({
      chatSessionId,
      organizationId: options.organizationId,
    });
  };

  const updateChatSession = async (chatSessionId: string, title: string) => {
    await updateSessionMutation.mutateAsync({
      chatSessionId,
      organizationId: options.organizationId,
      title,
    });
  };

  return {
    sessions: sessionsQuery.data?.sessions ?? [],
    isLoadingSessions: sessionsQuery.isLoading,
    createSession,
    deleteSession,
    updateChatSession,
    isCreatingSession: createSessionMutation.isPending,
    isDeletingSession: deleteSessionMutation.isPending,
  };
}

export function useChat(options: UseChatOptions) {
  const { chatSessionId, organizationId } = options;
  const { toast } = useToast();

  const utils = trpc.useUtils();
  const [input, setInput] = useState('');

  const { data: messagesData } = trpc.chat.getMessages.useQuery(
    { chatSessionId, organizationId },
    {
      enabled: !!chatSessionId && !!organizationId,
      staleTime: 1000 * 30,
    }
  );

  const { messages, sendMessage, regenerate, status, setMessages } = useAIChat({
    id: chatSessionId,
    messages: messagesData?.messages ?? [],
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { organizationId, chatSessionId },
    }),
    onFinish: () => {
      utils.chat.getMessages.invalidate({ chatSessionId, organizationId });
    },
    onError: (error: Error) => {
      // Parse error message - AI SDK may pass JSON string from API error responses
      let errorMessage = error.message || 'Failed to send message';

      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed.error) {
          errorMessage = parsed.error;
        }
      } catch {
        // Not JSON, use the message as-is
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Only sync from database on initial load or when switching chats
  // Don't sync after streaming finishes to avoid flicker
  useEffect(() => {
    // Only sync when:
    // 1. We have data from the database
    // 2. We're not currently streaming
    // 3. Local messages are empty (initial load) OR chatSessionId changed
    if (messagesData?.messages && status === 'ready' && messages.length === 0) {
      setMessages(messagesData.messages);
    }
  }, [chatSessionId, messagesData?.messages, setMessages, status, messages.length]);

  // Handle dangling user message (auto-regenerate if needed)
  // Only regenerate if:
  // 1. Database has messages
  // 2. Database has at least one user message but NO assistant messages (dangling state)
  // 3. Local messages state is empty (haven't started regenerating yet)
  useEffect(() => {
    if (!messagesData?.messages.length) return;

    const hasUserMessage = messagesData.messages.some((m) => m.role === 'user');
    const hasAssistantMessage = messagesData.messages.some((m) => m.role === 'assistant');

    if (hasUserMessage && !hasAssistantMessage && messages.length === 0) {
      regenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesData?.messages, messages.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (message: PromptInputMessage, e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.text.trim()) return;

    setInput('');
    await sendMessage({ text: message.text });
  };

  return {
    messages,
    input,
    isLoading: status === 'submitted' || status === 'streaming',
    handleInputChange,
    handleSubmit,
  };
}
