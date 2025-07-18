import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSubscriptionActions } from '@/hooks/use-subscription-actions';
import { mockFetchResponse, resetMocks } from '../setup/mocks';

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

  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSubscriptionActions', () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  describe('handleUpgrade', () => {
    it('should handle successful upgrade', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      const mockResponse = {
        success: true,
        checkoutUrl: 'https://polar.sh/checkout/123',
      };

      mockFetchResponse(mockResponse);

      await act(async () => {
        await result.current.handleUpgrade('pro', 'free');
      });

      expect(global.fetch).toHaveBeenCalled();
      expect(result.current.isUpgrading).toBe(false);
    });

    it('should track loading state during upgrade', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      expect(result.current.isUpgrading).toBe(false);
      expect(result.current.upgradeLoading).toBeNull();
    });
  });

  describe('handleCancel', () => {
    it('should provide cancel functionality', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      const mockResponse = { success: true };
      mockFetchResponse(mockResponse);

      await act(async () => {
        await result.current.handleCancel();
      });

      expect(result.current.isCanceling).toBe(false);
    });
  });

  describe('handleReactivate', () => {
    it('should provide reactivate functionality', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

      const mockResponse = { success: true };
      mockFetchResponse(mockResponse);

      await act(async () => {
        await result.current.handleReactivate();
      });

      expect(result.current.isReactivating).toBe(false);
    });
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
  });
});
