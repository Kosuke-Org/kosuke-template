import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';

import { emailOtp, signIn, signOut } from '@/lib/auth/client';
import { AUTH_ROUTES } from '@/lib/auth/constants';

import { useAuthActions } from '@/hooks/use-auth';

import { createQueryWrapper } from '../setup/mocks';

// Mock router functions
const mockRouterPush = vi.fn();
const mockUseRouter = vi.fn(() => ({
  push: mockRouterPush,
  refresh: vi.fn(),
}));

// Mock pathname
let mockPathname = '/';
const mockUsePathname = vi.fn(() => mockPathname);

vi.mock('@/lib/auth/client', () => {
  const mockSignOut = vi.fn();
  const mockVerifyEmail = vi.fn();
  const mockSignInEmailOtp = vi.fn();
  const mockUseSession = vi.fn(() => ({
    data: {
      session: null,
      user: null,
    },
    isPending: false,
    isRefetching: false,
    refetch: vi.fn(),
  }));

  return {
    signOut: mockSignOut,
    useSession: mockUseSession,
    emailOtp: {
      verifyEmail: mockVerifyEmail,
    },
    signIn: {
      emailOtp: mockSignInEmailOtp,
    },
  };
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => mockUseRouter(),
  usePathname: () => mockUsePathname(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock tRPC mutations
const mockRequestOtpMutate = vi.fn();
const mockRequestOtpMutateAsync = vi.fn();
const mockClearSignInAttemptMutateAsync = vi.fn();

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    auth: {
      requestOtp: {
        useMutation: vi.fn(
          (options?: {
            onSuccess?: () => void;
            onError?: (error: { message: string }) => void;
          }) => {
            // Call onSuccess immediately if provided (for testing success cases)
            if (options?.onSuccess) {
              // Store the callback to call it when mutate is called
              return {
                mutate: (data: { email: string; type: string }) => {
                  mockRequestOtpMutate(data);
                  options.onSuccess?.();
                },
                mutateAsync: async (data: { email: string; type: string }) => {
                  await mockRequestOtpMutateAsync(data);
                  options.onSuccess?.();
                  return Promise.resolve();
                },
                isPending: false,
                error: null,
              };
            }
            return {
              mutate: mockRequestOtpMutate,
              mutateAsync: mockRequestOtpMutateAsync,
              isPending: false,
              error: null,
            };
          }
        ),
      },
      clearSignInAttempt: {
        useMutation: vi.fn(() => ({
          mutateAsync: mockClearSignInAttemptMutateAsync,
          isPending: false,
          error: null,
        })),
      },
    },
  },
}));

const mockSignOut = vi.mocked(signOut);
const mockVerifyEmail = vi.mocked(emailOtp.verifyEmail);
const mockSignInEmailOtp = vi.mocked(signIn.emailOtp);

function setLocationSearch(redirectUrl: string | null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).location.search = redirectUrl
    ? `?redirect=${encodeURIComponent(redirectUrl)}`
    : '';
}

describe('useAuthActions', () => {
  const wrapper = createQueryWrapper();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
    mockVerifyEmail.mockResolvedValue({ error: null });
    mockSignInEmailOtp.mockResolvedValue({ error: null });
    mockClearSignInAttemptMutateAsync.mockResolvedValue(undefined);
    mockRouterPush.mockClear();

    // Reset global location.search
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = {
      search: '',
    };

    mockPathname = '/';
  });

  describe('signOut', () => {
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
    });
  });

  describe('signIn redirect behavior', () => {
    it('should redirect to verify OTP page with redirect param when redirectUrl is present', () => {
      const redirectUrl = '/accept-invitation/123';
      setLocationSearch(redirectUrl);
      mockPathname = '/sign-in';

      const { result } = renderHook(() => useAuthActions(), { wrapper });

      act(() => {
        result.current.signIn({ email: 'test@example.com' });
      });

      expect(mockRouterPush).toHaveBeenCalledWith(
        `${AUTH_ROUTES.VERIFY_OTP}?redirect=${encodeURIComponent(redirectUrl)}`
      );
    });

    it('should redirect to verify OTP page without redirect param when redirectUrl is not present', () => {
      setLocationSearch(null);
      mockPathname = '/sign-in';

      const { result } = renderHook(() => useAuthActions(), { wrapper });

      act(() => {
        result.current.signIn({ email: 'test@example.com' });
      });

      expect(mockRouterPush).toHaveBeenCalledWith(AUTH_ROUTES.VERIFY_OTP);
    });
  });

  describe('signUp redirect behavior', () => {
    it('should redirect to verify email page with redirect param when redirectUrl is present', () => {
      const redirectUrl = '/accept-invitation/123';
      setLocationSearch(redirectUrl);
      mockPathname = '/sign-up';

      const { result } = renderHook(() => useAuthActions(), { wrapper });

      act(() => {
        result.current.signUp({ email: 'test@example.com' });
      });

      expect(mockRouterPush).toHaveBeenCalledWith(
        `${AUTH_ROUTES.VERIFY_EMAIL}?redirect=${encodeURIComponent(redirectUrl)}`
      );
    });

    it('should redirect to verify email page without redirect param when redirectUrl is not present', () => {
      setLocationSearch(null);
      mockPathname = '/sign-up';

      const { result } = renderHook(() => useAuthActions(), { wrapper });

      act(() => {
        result.current.signUp({ email: 'test@example.com' });
      });

      expect(mockRouterPush).toHaveBeenCalledWith(AUTH_ROUTES.VERIFY_EMAIL);
    });
  });

  describe('OTP verification redirect behavior - sign-in flow', () => {
    it('should redirect to redirectUrl when OTP verification succeeds and redirectUrl is present', async () => {
      const redirectUrl = 'http://localhost:3000/accept-invitation/123';
      setLocationSearch(redirectUrl);
      mockPathname = '/sign-in/verify';

      const { result } = renderHook(() => useAuthActions(), { wrapper });

      await act(async () => {
        result.current.verifyOTP({ email: 'test@example.com', otp: '123456' });
      });

      expect(mockSignInEmailOtp).toHaveBeenCalledWith({ email: 'test@example.com', otp: '123456' });
      expect(mockClearSignInAttemptMutateAsync).toHaveBeenCalled();
      expect(window.location.href).toBe(redirectUrl);
    });

    it('should redirect to root when OTP verification succeeds and redirectUrl is not present', async () => {
      setLocationSearch(null);
      mockPathname = '/sign-in/verify';

      const { result } = renderHook(() => useAuthActions(), { wrapper });

      await act(async () => {
        result.current.verifyOTP({ email: 'test@example.com', otp: '123456' });
      });

      expect(mockSignInEmailOtp).toHaveBeenCalledWith({ email: 'test@example.com', otp: '123456' });
      expect(mockClearSignInAttemptMutateAsync).toHaveBeenCalled();
      expect(window.location.href).toBe('/');
    });
  });

  describe('OTP verification redirect behavior - sign-up flow', () => {
    it('should redirect to redirectUrl when email verification succeeds and redirectUrl is present', async () => {
      const redirectUrl = 'http://localhost:3000/accept-invitation/123';
      setLocationSearch(redirectUrl);
      mockPathname = '/sign-up/verify-email-address';
      const { result } = renderHook(() => useAuthActions(), { wrapper });

      await act(async () => {
        result.current.verifyOTP({ email: 'test@example.com', otp: '123456' });
      });

      expect(mockVerifyEmail).toHaveBeenCalledWith({ email: 'test@example.com', otp: '123456' });
      expect(mockClearSignInAttemptMutateAsync).toHaveBeenCalled();
      expect(window.location.href).toBe(redirectUrl);
    });

    it('should redirect to onboarding when email verification succeeds and redirectUrl is not present', async () => {
      setLocationSearch(null);
      mockPathname = '/sign-up/verify-email-address';
      const { result } = renderHook(() => useAuthActions(), { wrapper });

      await act(async () => {
        result.current.verifyOTP({ email: 'test@example.com', otp: '123456' });
      });

      expect(mockVerifyEmail).toHaveBeenCalledWith({ email: 'test@example.com', otp: '123456' });
      expect(mockClearSignInAttemptMutateAsync).toHaveBeenCalled();
      expect(window.location.href).toBe(AUTH_ROUTES.ROOT);
    });
  });

  describe('sendOTP redirect behavior', () => {
    it('should use sign-up flow when pathname includes /sign-up', () => {
      mockPathname = '/sign-up';
      const redirectUrl = '/accept-invitation/123';
      setLocationSearch(redirectUrl);

      const { result } = renderHook(() => useAuthActions(), { wrapper });

      act(() => {
        result.current.sendOTP({ email: 'test@example.com' });
      });

      // Should call signUp mutation which redirects to verify email
      expect(mockRouterPush).toHaveBeenCalledWith(
        `${AUTH_ROUTES.VERIFY_EMAIL}?redirect=${encodeURIComponent(redirectUrl)}`
      );
    });

    it('should use sign-in flow when pathname does not include /sign-up', () => {
      mockPathname = '/sign-in';
      const redirectUrl = 'http://localhost:3000/accept-invitation/123';
      setLocationSearch(redirectUrl);

      const { result } = renderHook(() => useAuthActions(), { wrapper });

      act(() => {
        result.current.sendOTP({ email: 'test@example.com' });
      });

      // Should call signIn mutation which redirects to verify OTP
      expect(mockRouterPush).toHaveBeenCalledWith(
        `${AUTH_ROUTES.VERIFY_OTP}?redirect=${encodeURIComponent(redirectUrl)}`
      );
    });
  });
});
