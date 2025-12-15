'use client';

import { trpc } from '@/lib/trpc/client';

import { useToast } from '@/hooks/use-toast';

interface UseChatOptions {
  organizationId: string;
}

export function useChat(options: UseChatOptions) {
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

  const createSession = async ({
    title,
    initialMessage,
  }: {
    title?: string;
    initialMessage?: string;
  }) => {
    return await createSessionMutation.mutateAsync({
      organizationId: options.organizationId,
      title,
      initialMessage,
    });
  };

  const deleteSession = async (sessionId: string) => {
    await deleteSessionMutation.mutateAsync({
      sessionId,
      organizationId: options.organizationId,
    });
  };

  const updateChatSession = async (sessionId: string, title: string) => {
    await updateSessionMutation.mutateAsync({
      sessionId,
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

export function useChatSession({
  sessionId,
  organizationId,
}: {
  sessionId: string;
  organizationId: string;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const invalidateMessages = async () => {
    await utils.chat.getMessages.invalidate({ sessionId, organizationId });
  };

  const messagesQuery = trpc.chat.getMessages.useQuery(
    {
      sessionId,
      organizationId,
    },
    {
      staleTime: 1000 * 30, // 30 seconds
      enabled: !!sessionId && !!organizationId,
      refetchInterval: false,
    }
  );

  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      invalidateMessages();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const generateAIResponseMutation = trpc.chat.generateAIResponse.useMutation({
    onSuccess: async () => {
      await invalidateMessages();
    },
  });

  const sendMessage = async (content: string) => {
    await sendMessageMutation.mutateAsync({
      sessionId,
      organizationId,
      content,
    });

    await generateAIResponseMutation.mutateAsync({
      sessionId,
      organizationId,
    });
  };

  const generateAIResponse = async () => {
    await generateAIResponseMutation.mutateAsync({
      sessionId,
      organizationId,
    });
  };

  return {
    messages: messagesQuery.data?.messages ?? [],
    isLoading: messagesQuery.isLoading,
    sendMessage,
    generateAIResponse,
    isSendingMessage: sendMessageMutation.isPending,
    isGeneratingResponse: generateAIResponseMutation.isPending,
    invalidateMessages,
  };
}
