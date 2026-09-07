'use client';

import { ReactNode, useState } from 'react';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TRPCClientError, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

import { signOut } from '@/lib/auth/client';
import { trpc } from '@/lib/trpc/client';

import { IframeMessageHandler } from '@/hooks/use-iframe-message-handler';
import { ProfileImageProvider } from '@/hooks/use-profile-image';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';

const handleUnauthorizedError = (error: unknown) => {
  if (error instanceof TRPCClientError && error.data?.code === 'UNAUTHORIZED') {
    // Session was revoked - sign out and redirect to sign-in
    signOut({
      fetchOptions: {
        onSuccess: () => {
          // Intentional hard navigation: a full document load after session
          // revocation discards every in-memory client cache (React Query,
          // Zustand, tRPC). A soft router.push() would keep that state alive.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = '/sign-in';
        },
      },
    });
  }
};

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: handleUnauthorizedError }),
        mutationCache: new MutationCache({ onError: handleUnauthorizedError }),
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: (failureCount, error) => {
              if (error instanceof TRPCClientError && error.data?.code === 'UNAUTHORIZED') {
                return false;
              }
              return failureCount < 1;
            },
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ProfileImageProvider>
            {children}
            <Toaster />
            <IframeMessageHandler />
          </ProfileImageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
