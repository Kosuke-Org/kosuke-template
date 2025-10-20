import { renderHook, act } from '@testing-library/react';
import { useAuthActions } from '@/hooks/use-auth-actions';
import { createQueryWrapper, createMockQueryClient } from '../setup/mocks';
import { vi } from 'vitest';

// Create mock query client
const mockQueryClient = createMockQueryClient();

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => mockQueryClient,
  };
});

// Mock Clerk
const mockSignOut = vi.fn();
vi.mock('@clerk/nextjs', () => ({
  useClerk: () => ({
    signOut: mockSignOut,
  }),
}));

// Mock useToast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('useAuthActions', () => {
  const wrapper = createQueryWrapper();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
  });

  it('should provide handleSignOut function and other state', () => {
    const { result } = renderHook(() => useAuthActions(), { wrapper });

    expect(result.current).toHaveProperty('handleSignOut');
    expect(result.current).toHaveProperty('isSigningOut');
    expect(result.current).toHaveProperty('signOutError');
    expect(typeof result.current.handleSignOut).toBe('function');
    expect(result.current.isSigningOut).toBe(false);
  });

  it('should redirect to home when handleSignOut is called', async () => {
    const { result } = renderHook(() => useAuthActions(), { wrapper });

    await act(async () => {
      result.current.handleSignOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: '/' });
    expect(mockQueryClient.clear).toHaveBeenCalled();
  });

  it('should handle multiple handleSignOut calls', async () => {
    const { result } = renderHook(() => useAuthActions(), { wrapper });

    await act(async () => {
      result.current.handleSignOut();
    });

    await act(async () => {
      result.current.handleSignOut();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(2);
    expect(mockQueryClient.clear).toHaveBeenCalledTimes(2);
  });
});
