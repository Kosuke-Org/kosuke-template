import { renderHook } from '@testing-library/react';
import { useAuthActions } from '@/hooks/use-auth-actions';

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

describe('useAuthActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide handleSignOut function', () => {
    const { result } = renderHook(() => useAuthActions());

    expect(result.current).toHaveProperty('handleSignOut');
    expect(typeof result.current.handleSignOut).toBe('function');
  });

  it('should redirect to home when handleSignOut is called', async () => {
    const { result } = renderHook(() => useAuthActions());

    await result.current.handleSignOut();

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('should handle multiple handleSignOut calls', async () => {
    const { result } = renderHook(() => useAuthActions());

    await result.current.handleSignOut();
    await result.current.handleSignOut();

    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(mockPush).toHaveBeenNthCalledWith(1, '/');
    expect(mockPush).toHaveBeenNthCalledWith(2, '/');
  });
});
