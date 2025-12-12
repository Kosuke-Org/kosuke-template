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

  const updateTitleMutation = trpc.chat.updateTitle.useMutation({
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

  const updateSessionTitle = async (sessionId: string, title: string) => {
    await updateTitleMutation.mutateAsync({
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
    updateSessionTitle,
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

  const sessionQuery = trpc.chat.getSession.useQuery(
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
      utils.chat.getSession.invalidate({
        sessionId,
        organizationId,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const sendMessage = async (content: string) => {
    return sendMessageMutation.mutateAsync({
      sessionId,
      organizationId,
      content,
    });
  };

  return {
    session: sessionQuery.data,
    messages: sessionQuery.data?.messages ?? [],
    isLoading: sessionQuery.isLoading,
    sendMessage,
    isSendingMessage: sendMessageMutation.isPending,
  };
}
