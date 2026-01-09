'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useIframeMessageHandlerStore } from '@/store/use-iframe-message-handler';

/**
 * Component to initialize iframe communication.
 * Should be mounted once in the root layout.
 */

const PARENT_URL_EVENT_TYPE = 'PARENT_URL';

export function IframeMessageHandler() {
  const router = useRouter();
  const { setParentUrl, parentUrl } = useIframeMessageHandlerStore();

  useEffect(() => {
    // Check if we're running in an iframe
    const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;

    if (!isEmbedded) {
      console.log('[iframe] Not embedded, skipping iframe setup');
      return;
    }

    console.log('[iframe] Setting up iframe message handler');

    // Get parent origin for secure postMessage
    // Use ancestorOrigins if available (Chrome/Edge), otherwise use document.referrer origin
    let parentOrigin = '*';
    if (window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0) {
      parentOrigin = window.location.ancestorOrigins[0];
    } else if (document.referrer) {
      try {
        parentOrigin = new URL(document.referrer).origin;
      } catch (e) {
        console.warn('[iframe] Could not parse referrer origin:', e);
      }
    }

    console.log('[iframe] Parent origin detected:', parentOrigin);

    const handleMessage = (event: MessageEvent) => {
      // Log ALL messages received, not just PARENT_URL ones
      console.log('[iframe] Received message from:', event.origin, 'data:', event.data);

      // Validate message structure
      if (event.data && event.data.type === PARENT_URL_EVENT_TYPE) {
        // Only process responses from parent (messages with url property)
        if (event.data.url) {
          console.log('[iframe] Received PARENT_URL response from parent:', event.data);

          // Validate the message is from the expected parent origin
          if (parentOrigin === '*' || event.origin === parentOrigin) {
            console.log('[iframe] Origin validated, processing message');
            setParentUrl(event.data.url);

            if (event.data.iframeRedirectUrl) {
              console.log('[iframe] Redirecting to:', event.data.iframeRedirectUrl);
              router.push(event.data.iframeRedirectUrl);
            }
          } else {
            console.warn('[iframe] Origin mismatch:', {
              received: event.origin,
              expected: parentOrigin,
            });
          }
        } else {
          console.log('[iframe] Received PARENT_URL request without url (ignoring)');
        }
      } else if (event.data) {
        console.log('[iframe] Received non-PARENT_URL message:', event.data.type || 'no type');
      }
    };

    window.addEventListener('message', handleMessage);
    console.log('[iframe] Message listener registered');

    // Request parent URL from parent frame only if we don't have it yet
    if (!parentUrl) {
      console.log('[iframe] Requesting parent URL from:', parentOrigin);
      window.parent.postMessage({ type: PARENT_URL_EVENT_TYPE }, parentOrigin);
    } else {
      console.log('[iframe] Parent URL already available:', parentUrl);
    }

    return () => {
      console.log('[iframe] Cleaning up message listener');
      window.removeEventListener('message', handleMessage);
    };
  }, [router, setParentUrl, parentUrl]);

  return null;
}
