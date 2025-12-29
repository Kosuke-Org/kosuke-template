'use client';

import { Suspense, use, useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import { Collapsible, CollapsibleContent } from '@radix-ui/react-collapsible';
import { Check, ChevronDown, Copy, ExternalLink, Loader2 } from 'lucide-react';

import { trpc } from '@/lib/trpc/client';
import type { MessageSource as MessageSourceType } from '@/lib/types/chat';
import { cn } from '@/lib/utils';

import { useAuth } from '@/hooks/use-auth';
import { useChat } from '@/hooks/use-chat';
import { useClipboard } from '@/hooks/use-clipboard';
import { useOrganization } from '@/hooks/use-organization';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { Button } from '@/components/ui/button';
import { CollapsibleTrigger } from '@/components/ui/collapsible';

const ChatContent = ({ chatId }: { chatId: string }) => {
  const { organization: activeOrganization, isLoading: isLoadingOrg } = useOrganization();
  const { isLoading: isLoadingAuth } = useAuth();
  const initialMessageSentRef = useRef(false);

  const sessionQuery = trpc.chat.getSession.useQuery(
    {
      chatSessionId: chatId,
      organizationId: activeOrganization?.id ?? '',
    },
    {
      enabled: !!chatId && !!activeOrganization?.id,
    }
  );

  const { messages, input, isLoading, handleInputChange, handleSubmit } = useChat({
    chatSessionId: sessionQuery.data?.id ?? '',
    organizationId: activeOrganization?.id ?? '',
  });

  // Auto-send initial message from sessionStorage when chat loads
  useEffect(() => {
    if (
      !initialMessageSentRef.current &&
      messages.length === 0 &&
      !isLoading &&
      sessionQuery.data?.id
    ) {
      const storageKey = `chat-initial-${sessionQuery.data.id}`;
      const initialMessage = sessionStorage.getItem(storageKey);

      if (initialMessage) {
        initialMessageSentRef.current = true;
        sessionStorage.removeItem(storageKey);

        handleSubmit({ text: initialMessage, files: [] });
      }
    }
  }, [messages.length, isLoading, sessionQuery.data?.id, handleSubmit]);

  if (isLoadingAuth || isLoadingOrg || sessionQuery.isLoading) {
    return null;
  }

  if (sessionQuery.isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div>
          {sessionQuery.error.data?.code === 'NOT_FOUND' ? (
            <h3 className="text-lg font-semibold">{sessionQuery.error.message}</h3>
          ) : (
            <>
              <h3 className="text-lg font-semibold">Something went wrong</h3>
              <p className="text-muted-foreground text-sm">
                Please try again later. If the problem persists, please contact support.
              </p>
            </>
          )}

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
        <ConversationContent className="gap-4">
          {messages.map((message, index) => {
            // Extract text content from UIMessage parts
            const textContent =
              message.parts
                ?.filter((part) => part.type === 'text')
                .map((part) => ('text' in part ? part.text : '') || '')
                .join(' ') || '';

            const metadata = message.metadata as { sources?: MessageSourceType[] } | undefined;
            const isLastMessage = index === messages.length - 1;
            const isStreaming = isLoading && isLastMessage && message.role === 'assistant';
            const showActions = !isStreaming && textContent.trim().length > 0;
            const showSources = !isStreaming && metadata?.sources && metadata.sources.length > 0;

            return (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {isStreaming && !textContent && (
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      <MessageResponse>Thinking...</MessageResponse>
                    </div>
                  )}
                  <MessageResponse>{textContent}</MessageResponse>
                </MessageContent>
                {showActions && (
                  <MessageActions className={cn(message.role === 'user' && 'justify-end')}>
                    <CopyMessageAction message={textContent} />
                  </MessageActions>
                )}
                {showSources && <MessageSource sources={metadata.sources ?? []} />}
              </Message>
            );
          })}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="sticky bottom-0">
        <PromptInput onSubmit={handleSubmit} className="bg-background pb-8">
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={handleInputChange}
              className="min-h-6"
              autoFocus={true}
            />
          </PromptInputBody>
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit
              disabled={!input?.trim() || isLoading}
              status={isLoading ? 'submitted' : 'ready'}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};

const MessageSource = ({ sources }: { sources: MessageSourceType[] }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="text-muted-foreground text-xs">
      <Collapsible
        // 24 is the height per line + collapse trigger height (16px)
        style={{ height: 24 * sources.length + 16 }}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <CollapsibleTrigger className="flex items-center justify-between gap-2">
          <span>
            Used {sources.length} {sources.length > 1 ? 'sources' : 'source'}
          </span>
          <ChevronDown className={cn('size-4 transition-transform', isOpen && 'rotate-x-180')} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 flex flex-col gap-1.5">
          {sources.map((source) => (
            <div key={source.url}>
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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

const CopyMessageAction = ({ message }: { message: string }) => {
  const { isCopied, onCopy } = useClipboard();

  const handleCopyMessage = () => {
    onCopy(message);
  };

  return (
    <MessageAction onClick={handleCopyMessage} tooltip="Copy">
      {isCopied ? <Check /> : <Copy />}
    </MessageAction>
  );
};

export default function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const resolvedParams = use(params);

  return (
    <Suspense>
      <ChatContent chatId={resolvedParams.chatId} />
    </Suspense>
  );
}
