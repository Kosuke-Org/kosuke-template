/**
 * Auth Hooks
 * Client-side authentication hooks using Better Auth
 *
 * Provides comprehensive access to session, user, auth state, and auth actions
 */

'use client';

import { signOut, useSession, emailOtp, signIn } from '@/lib/auth/client';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useRouter, usePathname } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { AUTH_ROUTES } from '@/lib/auth/constants';

/**
 * Primary authentication hook - use this for all auth needs
 *
 * @returns Complete auth state including session, user, and loading status
 *
 * @example
 * ```tsx
 * const { user, session, userId, isLoading } = useAuth();
 *
 * if (isLoading) return <Skeleton />;
 *
 * return <div>Welcome {user.name}</div>;
 * ```
 */
export function useAuth() {
  const { data, isPending, isRefetching, refetch } = useSession();

  const session = data?.session;
  const user = data?.user;

  return {
    session,
    user,
    userId: user?.id,
    isLoading: isPending || isRefetching,
    isSignedIn: !!user,
    activeOrganizationSlug: session?.activeOrganizationSlug,
    activeOrganizationId: session?.activeOrganizationId,
    refetch,
  };
}

/**
 * Authentication actions hook with Email OTP support
 * Provides sign in, sign up, and sign out functionality with loading states
 *
 * @returns Auth action functions and their loading states
 *
 * @example
 * ```tsx
 * const { sendOTP, verifyOTP, signOut, isSendingOTP } = useAuthActions();
 *
 * const handleSendOTP = () => {
 *   sendOTP({ email: 'user@example.com' });
 * };
 * ```
 */
export function useAuthActions() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const clearSignInAttemptMutation = trpc.auth.clearSignInAttempt.useMutation();

  const isSignUpFlow = pathname?.includes('/sign-up');
  let redirectUrl: string | null = null;

  if (typeof window !== 'undefined') {
    redirectUrl = new URLSearchParams(window.location.search).get('redirect');
  }

  const verifyOTPMutation = useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      if (isSignUpFlow) {
        const result = await emailOtp.verifyEmail({ email, otp });

        if (result.error) {
          throw new Error(result.error.message ?? 'Failed to verify email');
        }
      } else {
        const result = await signIn.emailOtp({ email, otp });

        if (result.error) {
          throw new Error(result.error.message ?? 'Failed to sign in');
        }
      }
    },
    onSuccess: async () => {
      await clearSignInAttemptMutation.mutate();

      // do page refresh to avoid stale session
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        // middleware will redirect to onboarding if no organization is found
        window.location.href = AUTH_ROUTES.ROOT;
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Invalid verification code',
        variant: 'destructive',
      });
    },
  });

  const signInMutation = trpc.auth.requestOtp.useMutation({
    onSuccess: () => {
      if (redirectUrl) {
        const params = new URLSearchParams({ redirect: redirectUrl });
        router.push(`${AUTH_ROUTES.VERIFY_OTP}?${params.toString()}`);
      } else {
        router.push(AUTH_ROUTES.VERIFY_OTP);
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign in',
        variant: 'destructive',
      });
    },
  });

  const signUpMutation = trpc.auth.requestOtp.useMutation({
    onSuccess: () => {
      if (redirectUrl) {
        const params = new URLSearchParams({ redirect: redirectUrl });
        router.push(`${AUTH_ROUTES.VERIFY_EMAIL}?${params.toString()}`);
      } else {
        router.push(AUTH_ROUTES.VERIFY_EMAIL);
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign up',
        variant: 'destructive',
      });
    },
  });

  const signOutMutation = useMutation({
    mutationFn: () => {
      return signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push(AUTH_ROUTES.ROOT);
          },
        },
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to sign out',
        variant: 'destructive',
      });
    },
  });

  const handleSendSignInOTP = ({ email }: { email: string }) => {
    return signInMutation.mutate({ email, type: 'sign-in' });
  };

  const handleSendSignUpOTP = ({ email }: { email: string }) => {
    return signUpMutation.mutate({ email, type: 'email-verification' });
  };

  const handleSendOTP = ({ email }: { email: string }) => {
    if (isSignUpFlow) return handleSendSignUpOTP({ email });
    return handleSendSignInOTP({ email });
  };

  return {
    // Email OTP actions
    sendOTP: handleSendOTP,
    isSendingOTP: signInMutation.isPending || signUpMutation.isPending,
    verifyOTP: verifyOTPMutation.mutate,
    isVerifyingOTP: verifyOTPMutation.isPending || clearSignInAttemptMutation.isPending,
    verifyOTPError: verifyOTPMutation.error,

    // Clear sign in attempt cookie
    clearSignInAttempt: clearSignInAttemptMutation.mutate,

    signIn: handleSendSignInOTP,
    isSigningIn: signInMutation.isPending,
    signInError: signInMutation.error,

    signUp: handleSendSignUpOTP,
    isSigningUp: signUpMutation.isPending,
    signUpError: signUpMutation.error,

    signOut: signOutMutation.mutate,
    signOutError: signOutMutation.error,
    isSigningOut: signOutMutation.isPending,
  };
}
