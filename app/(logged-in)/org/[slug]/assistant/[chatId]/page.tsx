'use client';

import { Suspense, use, useState } from 'react';

import { MessageSquare } from 'lucide-react';

import type { GroundingMetadata } from '@/lib/ai/client';
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
import { Skeleton } from '@/components/ui/skeleton';

function ChatPageSkeleton() {
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
}

interface ChatPageProps {
  params: Promise<{
    slug: string;
    chatId: string;
  }>;
}

function ChatContent({ resolvedParams }: { resolvedParams: { slug: string; chatId: string } }) {
  const { organization: activeOrganization, isLoading: isLoadingOrg } = useOrganization();
  const { isLoading: isLoadingAuth } = useAuth();
  const [inputMessage, setInputMessage] = useState('');

  const { messages, isLoading, sendMessage, isSendingMessage } = useChatSession({
    sessionId: resolvedParams.chatId,
    organizationId: activeOrganization?.id ?? '',
  });

  const handleSendMessage = async () => {
    setInputMessage('');
    await sendMessage(inputMessage.trim());
  };

  const getGroundingMetadata = (groundingMetadata: string) => {
    return JSON.parse(groundingMetadata) as GroundingMetadata;
  };

  if (isLoading || isLoadingAuth || isLoadingOrg) {
    return <ChatPageSkeleton />;
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
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  <MessageResponse>{message.content}</MessageResponse>
                  {message.groundingMetadata && (
                    <p className="text-muted-foreground text-xs">
                      Source:{' '}
                      {getGroundingMetadata(message.groundingMetadata)?.groundingChunks?.map(
                        (groundingChunk, index) => (
                          <span key={index}>{groundingChunk.retrievedContext?.title}</span>
                        )
                      )}
                    </p>
                  )}
                </MessageContent>
              </Message>
            ))
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
              disabled={!inputMessage.trim()}
              status={isSendingMessage ? 'submitted' : 'ready'}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

export default function ChatPage({ params }: ChatPageProps) {
  const resolvedParams = use(params);

  return (
    <Suspense fallback={<ChatPageSkeleton />}>
      <ChatContent resolvedParams={resolvedParams} />
    </Suspense>
  );
}
