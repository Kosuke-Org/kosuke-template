'use client';

import { useEffect, useState } from 'react';

import { useChat as useAIChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';

import { trpc } from '@/lib/trpc/client';

import { useToast } from '@/hooks/use-toast';

import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';

interface UseChatOptions {
  organizationId: string;
}

export function useChatSession(options: UseChatOptions) {
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

export function useChat({
  chatSessionId,
  organizationId,
}: {
  chatSessionId: string;
  organizationId: string;
}) {
  const utils = trpc.useUtils();
  const [input, setInput] = useState('');

  const { data: messagesData } = trpc.chat.getMessages.useQuery(
    { chatSessionId, organizationId },
    { enabled: !!chatSessionId && !!organizationId, staleTime: 1000 * 30 }
  );

  const { messages, sendMessage, regenerate, status, setMessages } = useAIChat({
    id: chatSessionId,
    messages: (messagesData?.messages ?? []) as unknown as UIMessage[],
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { organizationId, chatSessionId },
    }),
    onFinish: () => {
      // Invalidate messages query to sync with database
      utils.chat.getMessages.invalidate({ chatSessionId, organizationId });
    },
    onError: (error: Error) => {
      console.error('Chat error:', error);
    },
  });

  // Update messages when data is refetched
  useEffect(() => {
    if (messagesData?.messages && messages.length === 0) {
      setMessages(messagesData.messages as unknown as UIMessage[]);

      // If there's a user message but no assistant response, trigger the AI
      const hasUserMessage = messagesData.messages.some((m) => m.role === 'user');
      const hasAssistantMessage = messagesData.messages.some((m) => m.role === 'assistant');

      if (hasUserMessage && !hasAssistantMessage) {
        // Trigger AI response for the initial message
        regenerate();
      }
    }
  }, [messagesData?.messages, messages.length, setMessages, regenerate]);

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
