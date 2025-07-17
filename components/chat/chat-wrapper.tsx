'use client';

import { useUser } from '@clerk/nextjs';
import { ChatProvider } from './chat-provider';
import { ChatInterface } from './chat-interface';
import { ChatFloatingButton } from './chat-floating-button';
import { GlobalChatHandler } from './global-chat-handler';

interface ChatWrapperProps {
  children: React.ReactNode;
}

export function ChatWrapper({ children }: ChatWrapperProps) {
  const { isSignedIn } = useUser();

  if (!isSignedIn) {
    return <>{children}</>;
  }

  return (
    <ChatProvider>
      {children}
      <ChatInterface />
      <ChatFloatingButton />
      <GlobalChatHandler />
    </ChatProvider>
  );
}
