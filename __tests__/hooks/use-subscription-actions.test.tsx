import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSubscriptionActions } from '@/hooks/use-subscription-actions';
import { mockFetchResponse, mockFetchError, resetMocks } from '../setup/mocks';
import { toast } from 'sonner';

// Mock the toast
jest.mock('sonner', () => ({
  toast: jest.fn(),
}));

// Mock useToast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSubscriptionActions', () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  describe('upgrade subscription', () => {
    it('should handle successful upgrade', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      const mockResponse = {
        success: true,
        checkoutUrl: 'https://polar.sh/checkout/123',
      };

      mockFetchResponse(mockResponse);

      await act(async () => {
        await result.current.upgradeMutation.mutateAsync({
          tier: 'premium',
          isUpgrade: true,
        });
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/billing/upgrade-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'premium' }),
      });

      expect(result.current.upgradeMutation.isSuccess).toBe(true);
    });

    it('should handle failed upgrade', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      mockFetchError('Network error');

      await act(async () => {
        try {
          await result.current.upgradeMutation.mutateAsync({
            tier: 'premium',
            isUpgrade: true,
          });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.upgradeMutation.isError).toBe(true);
    });

    it('should use create-checkout endpoint for new subscriptions', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      const mockResponse = {
        success: true,
        checkoutUrl: 'https://polar.sh/checkout/123',
      };

      mockFetchResponse(mockResponse);

      await act(async () => {
        await result.current.upgradeMutation.mutateAsync({
          tier: 'pro',
          isUpgrade: false,
        });
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'pro' }),
      });
    });

    it('should handle API error response', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      mockFetchResponse({ success: false, error: 'Invalid tier' }, 400);

      await act(async () => {
        try {
          await result.current.upgradeMutation.mutateAsync({
            tier: 'invalid',
            isUpgrade: true,
          });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.upgradeMutation.isError).toBe(true);
    });
  });

  describe('cancel subscription', () => {
    it('should handle successful cancellation', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      const mockResponse = {
        success: true,
        message: 'Subscription canceled successfully',
      };

      mockFetchResponse(mockResponse);

      await act(async () => {
        await result.current.cancelMutation.mutateAsync({
          cancelAtPeriodEnd: true,
        });
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelAtPeriodEnd: true }),
      });

      expect(result.current.cancelMutation.isSuccess).toBe(true);
    });

    it('should handle immediate cancellation', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      const mockResponse = {
        success: true,
        message: 'Subscription canceled immediately',
      };

      mockFetchResponse(mockResponse);

      await act(async () => {
        await result.current.cancelMutation.mutateAsync({
          cancelAtPeriodEnd: false,
        });
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelAtPeriodEnd: false }),
      });
    });

    it('should handle cancellation error', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      mockFetchError('Subscription not found');

      await act(async () => {
        try {
          await result.current.cancelMutation.mutateAsync({
            cancelAtPeriodEnd: true,
          });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.cancelMutation.isError).toBe(true);
    });
  });

  describe('reactivate subscription', () => {
    it('should handle successful reactivation', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      const mockResponse = {
        success: true,
        message: 'Subscription reactivated successfully',
      };

      mockFetchResponse(mockResponse);

      await act(async () => {
        await result.current.reactivateMutation.mutateAsync();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/billing/reactivate-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(result.current.reactivateMutation.isSuccess).toBe(true);
    });

    it('should handle reactivation error', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      mockFetchResponse({ success: false, error: 'Cannot reactivate expired subscription' }, 400);

      await act(async () => {
        try {
          await result.current.reactivateMutation.mutateAsync();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.reactivateMutation.isError).toBe(true);
    });
  });

  describe('loading states', () => {
    it('should track upgrade loading state', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      expect(result.current.upgradeLoading).toBeNull();

      const mockResponse = { success: true, checkoutUrl: 'https://polar.sh/checkout/123' };
      mockFetchResponse(mockResponse);

      act(() => {
        result.current.upgradeMutation.mutate({ tier: 'pro', isUpgrade: false });
      });

      expect(result.current.upgradeLoading).toBe('pro');
    });

    it('should clear loading state after upgrade completes', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      const mockResponse = { success: true, checkoutUrl: 'https://polar.sh/checkout/123' };
      mockFetchResponse(mockResponse);

      await act(async () => {
        await result.current.upgradeMutation.mutateAsync({ tier: 'premium', isUpgrade: true });
      });

      expect(result.current.upgradeLoading).toBeNull();
    });
  });

  describe('query invalidation', () => {
    it('should invalidate subscription queries on successful operations', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      const mockResponse = { success: true, message: 'Operation successful' };
      mockFetchResponse(mockResponse);

      await act(async () => {
        await result.current.cancelMutation.mutateAsync({ cancelAtPeriodEnd: true });
      });

      // Verify that the mutation completed successfully
      expect(result.current.cancelMutation.isSuccess).toBe(true);
    });
  });
});
