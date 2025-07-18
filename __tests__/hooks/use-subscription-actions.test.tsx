import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSubscriptionActions } from '@/hooks/use-subscription-actions';
import { mockFetchResponse, resetMocks } from '../setup/mocks';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryWrapper';

  return Wrapper;
};

describe('useSubscriptionActions - Business Logic', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('should handle upgrade operations', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

    const mockResponse = {
      success: true,
      checkoutUrl: 'https://polar.sh/checkout/123',
    };

    mockFetchResponse(mockResponse);

    await act(async () => {
      await result.current.handleUpgrade('premium', 'pro');
    });

    expect(global.fetch).toHaveBeenCalled();
    expect(result.current.isUpgrading).toBe(false);
  });

  it('should handle cancellation operations', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

    mockFetchResponse({ success: true });

    await act(async () => {
      await result.current.handleCancel();
    });

    expect(result.current.isCanceling).toBe(false);
  });

  it('should handle reactivation operations', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

    mockFetchResponse({ success: true });

    await act(async () => {
      await result.current.handleReactivate();
    });

    expect(result.current.isReactivating).toBe(false);
  });

  it('should track loading states correctly', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSubscriptionActions(), { wrapper });

    expect(result.current.isUpgrading).toBe(false);
    expect(result.current.isCanceling).toBe(false);
    expect(result.current.isReactivating).toBe(false);
    expect(result.current.upgradeLoading).toBeNull();
  });
});
