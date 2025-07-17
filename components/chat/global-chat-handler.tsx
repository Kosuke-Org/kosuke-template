'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useChat } from './chat-provider';

export function GlobalChatHandler() {
  const { openChat, isOpen } = useChat();
  const { isSignedIn } = useUser();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD+K or Ctrl+K to open chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();

        // Only open chat if user is signed in and chat is not already open
        if (isSignedIn && !isOpen) {
          openChat();
        } else if (!isSignedIn) {
          // Could show a toast or redirect to sign in
          console.log('Please sign in to use the DevOps assistant');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openChat, isOpen, isSignedIn]);

  return null; // This component doesn't render anything
}
