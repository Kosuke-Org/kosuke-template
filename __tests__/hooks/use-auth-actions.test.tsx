import { renderHook, act } from '@testing-library/react';
import { useAuthActions } from '@/hooks/use-auth';
import { createQueryWrapper, createMockQueryClient } from '../setup/mocks';
import { vi } from 'vitest';
import { signOut } from '@/lib/auth/client';

// Create mock query client
const mockQueryClient = createMockQueryClient();

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => mockQueryClient,
  };
});

vi.mock('@/lib/auth/client', () => {
  const mockSignOut = vi.fn();

  return {
    signOut: mockSignOut,
  };
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    auth: {
      requestOtp: { useMutation: vi.fn(() => ({ mutateAsync: vi.fn(), mutate: vi.fn() })) },
      clearSignInAttempt: { useMutation: vi.fn(() => ({ mutateAsync: vi.fn(), mutate: vi.fn() })) },
    },
  },
}));

const mockSignOut = vi.mocked(signOut);

describe('useAuthActions', () => {
  const wrapper = createQueryWrapper();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
  });

  it('should provide handleSignOut function and other state', () => {
    const { result } = renderHook(() => useAuthActions(), { wrapper });

    expect(result.current).toHaveProperty('signOut');
    expect(result.current).toHaveProperty('isSigningOut');
    expect(result.current).toHaveProperty('signOutError');
    expect(typeof result.current.signOut).toBe('function');
    expect(result.current.isSigningOut).toBe(false);
  });

  it('should redirect to home when handleSignOut is called', async () => {
    const { result } = renderHook(() => useAuthActions(), { wrapper });

    await act(async () => {
      result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledWith({
      fetchOptions: {
        onSuccess: expect.any(Function),
      },
    });
    expect(mockQueryClient.clear).toHaveBeenCalled();
  });

  it('should handle multiple handleSignOut calls', async () => {
    const { result } = renderHook(() => useAuthActions(), { wrapper });

    await act(async () => {
      result.current.signOut();
    });

    await act(async () => {
      result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(2);
    expect(mockQueryClient.clear).toHaveBeenCalledTimes(2);
  });
});
