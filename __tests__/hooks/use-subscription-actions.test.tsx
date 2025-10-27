import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSubscriptionActions } from '@/hooks/use-subscription-actions';
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

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
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

describe('useSubscriptionActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToast.mockClear();
  });

  describe('hook structure', () => {
    it('should return all expected properties', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      expect(result.current).toHaveProperty('handleUpgrade');
      expect(result.current).toHaveProperty('handleCancel');
      expect(result.current).toHaveProperty('handleReactivate');
      expect(result.current).toHaveProperty('isUpgrading');
      expect(result.current).toHaveProperty('isCanceling');
      expect(result.current).toHaveProperty('isReactivating');
      expect(result.current).toHaveProperty('upgradeLoading');

      expect(typeof result.current.handleUpgrade).toBe('function');
      expect(typeof result.current.handleCancel).toBe('function');
      expect(typeof result.current.handleReactivate).toBe('function');
      expect(typeof result.current.isUpgrading).toBe('boolean');
      expect(typeof result.current.isCanceling).toBe('boolean');
      expect(typeof result.current.isReactivating).toBe('boolean');
    });

    it('should have correct initial loading states', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      expect(result.current.isUpgrading).toBe(false);
      expect(result.current.isCanceling).toBe(false);
      expect(result.current.isReactivating).toBe(false);
      expect(result.current.upgradeLoading).toBeNull();
    });
  });

  describe('basic functionality', () => {
    it('should provide upgrade functionality', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      expect(result.current.handleUpgrade).toBeDefined();
      expect(typeof result.current.handleUpgrade).toBe('function');
    });

    it('should provide cancel functionality', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      expect(result.current.handleCancel).toBeDefined();
      expect(typeof result.current.handleCancel).toBe('function');
    });

    it('should provide reactivate functionality', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      expect(result.current.handleReactivate).toBeDefined();
      expect(typeof result.current.handleReactivate).toBe('function');
    });
  });

  describe('loading states', () => {
    it('should track loading states correctly', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      // All operations should start in non-loading state
      expect(result.current.isUpgrading).toBe(false);
      expect(result.current.isCanceling).toBe(false);
      expect(result.current.isReactivating).toBe(false);
      expect(result.current.upgradeLoading).toBeNull();
    });
  });
});
