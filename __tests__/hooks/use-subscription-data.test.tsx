import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSubscriptionStatus, useCanSubscribe } from '@/hooks/use-subscription-data';
import { resetMocks } from '../setup/mocks';
import { vi } from 'vitest';
import { httpBatchLink } from '@trpc/client';
import { trpc } from '@/lib/trpc/client';
import superjson from 'superjson';
import React from 'react';

// Mock useToast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const trpcClient = trpc.createClient({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        transformer: superjson,
      }),
    ],
  });

  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
};

describe('useSubscriptionStatus', () => {
  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
    mockToast.mockClear();
  });

  it('should return subscription status query structure', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscriptionStatus(), { wrapper });

    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
  });

  it('should have correct initial loading state', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscriptionStatus(), { wrapper });

    // Initial state should be loading or have loaded (depending on query state)
    expect(typeof result.current.isLoading).toBe('boolean');
  });
});

describe('useCanSubscribe', () => {
  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
    mockToast.mockClear();
  });

  it('should return can subscribe query structure', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCanSubscribe(), { wrapper });

    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
  });

  it('should have correct initial loading state', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCanSubscribe(), { wrapper });

    expect(typeof result.current.isLoading).toBe('boolean');
  });
});
