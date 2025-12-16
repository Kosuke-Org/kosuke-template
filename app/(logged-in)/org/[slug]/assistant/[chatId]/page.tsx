'use client';

import { Suspense, use, useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import { inferRouterOutputs } from '@trpc/server';
import { ChevronDown, ExternalLink, Loader2, MessageSquare } from 'lucide-react';

import { trpc } from '@/lib/trpc/client';
import { AppRouter } from '@/lib/trpc/router';
import { cn } from '@/lib/utils';

import { useAuth } from '@/hooks/use-auth';
import { useChatSession } from '@/hooks/use-chat';
import { useOrganization } from '@/hooks/use-organization';

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type MessageSources = RouterOutputs['chat']['getMessages']['messages'][number]['sources'];

const ChatPageSkeleton = () => {
  return (
    <div className="mx-auto flex size-full max-w-3xl flex-col">
      <div className="flex-1">
        <div className="flex flex-col gap-8 p-4">
          {Array.from({ length: 10 }).map((_, i) => {
            const isUser = i % 2 === 0;
            return (
              <div
                key={i}
                className={cn(
                  'flex w-full max-w-[95%] flex-col gap-2',
                  isUser && 'ml-auto justify-end'
                )}
              >
                <div
                  className={cn(
                    'text-foreground',
                    isUser && 'bg-secondary text-foreground ml-auto rounded-lg'
                  )}
                >
                  <Skeleton className={`h-7 ${isUser ? 'w-64' : 'w-96'}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Skeleton className="mb-8 h-24 w-full" />
    </div>
  );
};

const ChatContent = ({ chatId }: { chatId: string }) => {
  const { organization: activeOrganization, isLoading: isLoadingOrg } = useOrganization();
  const { isLoading: isLoadingAuth } = useAuth();
  const [inputMessage, setInputMessage] = useState('');

  const sessionQuery = trpc.chat.getSession.useQuery(
    {
      chatSessionId: chatId,
      organizationId: activeOrganization?.id ?? '',
    },
    {
      enabled: !!chatId && !!activeOrganization?.id,
    }
  );

  const {
    messages,
    isLoading,
    sendMessage,
    generateAIResponse,
    isSendingMessage,
    isGeneratingResponse,
  } = useChatSession({
    chatSessionId: chatId,
    organizationId: activeOrganization?.id ?? '',
  });

  // Track if we've already triggered AI response for the current last message
  const lastProcessedMessageId = useRef<string | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (isLoading || !messages.length || isProcessingRef.current) return;

    const lastMessage = messages[messages.length - 1];

    // Check if last message is from user and we haven't processed it yet
    if (
      lastMessage.role === 'user' &&
      lastMessage.id !== lastProcessedMessageId.current &&
      !isGeneratingResponse &&
      !isSendingMessage
    ) {
      isProcessingRef.current = true;
      lastProcessedMessageId.current = lastMessage.id;
      generateAIResponse().finally(() => {
        isProcessingRef.current = false;
      });
    }
  }, [messages, isLoading, isGeneratingResponse, isSendingMessage, generateAIResponse]);

  const handleSendMessage = async () => {
    const messageContent = inputMessage.trim();
    setInputMessage('');
    await sendMessage(messageContent);
  };

  if (isLoading || isLoadingAuth || isLoadingOrg) {
    return <ChatPageSkeleton />;
  }

  if (sessionQuery.isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div>
          <h3 className="text-lg font-semibold">{sessionQuery.error.message}</h3>
          <Button asChild variant="link">
            <Link href={`/org/${activeOrganization?.slug}/assistant`}>
              Go back to the assistant page
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex size-full max-w-3xl flex-col">
      <Conversation>
        <ConversationContent className="pb-8">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<MessageSquare className="size-12" />}
              title="Start a conversation"
              description="Type a message below to begin chatting"
            />
          ) : (
            <>
              {messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    <MessageResponse>{message.content}</MessageResponse>
                    {message.sources.length > 0 && <MessageSource sources={message.sources} />}
                  </MessageContent>
                </Message>
              ))}
              {isGeneratingResponse && (
                <Message from="assistant" key="assistant">
                  <MessageContent>
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      <MessageResponse>Thinking...</MessageResponse>
                    </div>
                  </MessageContent>
                </Message>
              )}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="sticky bottom-0">
        <PromptInput onSubmit={handleSendMessage} className="bg-background pb-8">
          <PromptInputBody>
            <PromptInputTextarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="min-h-6"
              autoFocus={true}
            />
          </PromptInputBody>
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit
              disabled={!inputMessage.trim() || isSendingMessage || isGeneratingResponse}
              status={isSendingMessage || isGeneratingResponse ? 'submitted' : 'ready'}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};

const MessageSource = ({ sources }: { sources: MessageSources }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="text-muted-foreground text-xs">
      <Collapsible style={{ height: 42 * sources.length }} open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="mb-2 flex items-center justify-between gap-2">
          <span>
            Used {sources.length} {sources.length > 1 ? 'sources' : 'source'}
          </span>
          <ChevronDown className={cn('size-4 transition-transform', isOpen && 'rotate-x-180')} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-1.5">
            {sources.map((source, index) => (
              <div key={index} className="flex items-center gap-1.5">
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground flex items-center gap-1 truncate underline decoration-dotted underline-offset-2 transition-colors"
                  >
                    <span className="truncate">{source.title}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <span className="truncate">{source.title}</span>
                )}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const resolvedParams = use(params);

  return (
    <Suspense fallback={<ChatPageSkeleton />}>
      <ChatContent chatId={resolvedParams.chatId} />
    </Suspense>
  );
}
