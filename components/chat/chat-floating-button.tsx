'use client';

import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from './chat-provider';
import { cn } from '@/lib/utils';

export function ChatFloatingButton() {
  const { openChat, isOpen } = useChat();

  if (isOpen) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
      <Button
        onClick={openChat}
        className={cn(
          'h-14 px-6 rounded-full shadow-lg',
          'bg-primary hover:bg-primary/90 text-primary-foreground',
          'transition-all duration-200 hover:scale-105',
          'flex items-center gap-2'
        )}
      >
        <MessageCircle className="h-5 w-5" />
        <span className="font-medium">DevOps Assistant</span>
      </Button>
    </div>
  );
}
