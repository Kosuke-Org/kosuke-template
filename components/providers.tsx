'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { ReactNode, useState } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { ProfileImageProvider } from '@/hooks/use-profile-image';
import { Toaster } from '@/components/ui/sonner';
import { trpc } from '@/lib/trpc/client';
import superjson from 'superjson';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
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
          </ProfileImageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
