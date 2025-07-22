import { renderHook, act } from '@testing-library/react';
import { useAuthActions } from '@/hooks/use-auth-actions';
import { createQueryWrapper } from '../setup/mocks';

// Mock useRouter
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Clerk
const mockSignOut = jest.fn();
jest.mock('@clerk/nextjs', () => ({
  useClerk: () => ({
    signOut: mockSignOut,
  }),
}));

// Mock useToast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('useAuthActions', () => {
  const wrapper = createQueryWrapper();

  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(mockPush).toHaveBeenCalledWith('/');
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
    expect(mockPush).toHaveBeenCalledTimes(2);
  });
});
