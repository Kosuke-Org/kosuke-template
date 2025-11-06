/**
 * Auth Hooks
 * Client-side authentication hooks using Better Auth
 *
 * Provides comprehensive access to session, user, auth state, and auth actions
 */

'use client';

import { signUp, signOut, useSession, emailOtp, signIn } from '@/lib/auth/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
 * const { user, session, userId, isAuthenticated, isLoading } = useAuth();
 *
 * if (isLoading) return <Skeleton />;
 * if (!isAuthenticated) return <SignInPrompt />;
 *
 * return <div>Welcome {user.name}</div>;
 * ```
 */
export function useAuth() {
  const { data, isPending } = useSession();

  return {
    session: data?.session,
    user: data?.user,
    userId: data?.user?.id,
    isLoading: isPending,
    isAuthenticated: !!data,
    isSignedIn: !!data?.user,
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
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  const clearSignInAttemptMutation = trpc.signInAttempt.clear.useMutation();
  const createSignInAttemptMutation = trpc.signInAttempt.create.useMutation();

  const sendOTPMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const result = await emailOtp.sendVerificationOtp({ email, type: 'sign-in' });

      if (result.error) throw new Error(result.error.message || 'Internal error');

      return { email };
    },
    onSuccess: async ({ email }) => {
      await createSignInAttemptMutation.mutateAsync({ email });

      if (pathname !== AUTH_ROUTES.VERIFY_OTP) {
        router.push(AUTH_ROUTES.VERIFY_OTP);
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send verification code',
        variant: 'destructive',
      });
    },
    // Prevent duplicate submissions
    retry: false,
  });

  // Verify OTP mutation
  const verifyOTPMutation = useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      const result = await emailOtp.checkVerificationOtp({ type: 'sign-in', email, otp });

      if (result.error) throw new Error(result.error.message || 'Internal error');

      return { email, otp };
    },
    onSuccess: async ({ email, otp }) => {
      const result = await signIn.emailOtp({ email, otp });

      if (result.error) throw new Error(result.error.message || 'Internal error');

      await clearSignInAttemptMutation.mutateAsync();
      queryClient.invalidateQueries();
      router.push(AUTH_ROUTES.ROOT);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Invalid verification code',
        variant: 'destructive',
      });
    },
  });

  // Sign up mutation
  const signUpMutation = useMutation({
    mutationFn: async ({
      email,
      password,
      name,
    }: {
      email: string;
      password: string;
      name: string;
    }) => {
      const result = await signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Sign up failed');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      router.push('/onboarding');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to sign up',
        variant: 'destructive',
      });
    },
  });

  // Sign out mutation
  const signOutMutation = useMutation({
    mutationFn: async () => {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push(AUTH_ROUTES.ROOT);
          },
        },
      });
    },
    onSuccess: () => {
      queryClient.clear();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to sign out',
        variant: 'destructive',
      });
    },
  });

  return {
    // Email OTP actions
    sendOTP: sendOTPMutation.mutate,
    verifyOTP: verifyOTPMutation.mutate,
    isSendingOTP: sendOTPMutation.isPending,
    isVerifyingOTP: verifyOTPMutation.isPending,
    sendOTPError: sendOTPMutation.error,
    verifyOTPError: verifyOTPMutation.error,

    // Clear sign in attempt stored in a httpOnly cookie
    clearSignInAttempt: clearSignInAttemptMutation.mutate,
    isClearingSignInAttempt: clearSignInAttemptMutation.isPending,
    clearSignInAttemptError: clearSignInAttemptMutation.error,

    // Create sign in attempt stored in a httpOnly cookie
    createSignInAttempt: createSignInAttemptMutation.mutate,
    isCreatingSignInAttempt: createSignInAttemptMutation.isPending,
    createSignInAttemptError: createSignInAttemptMutation.error,

    signUp: signUpMutation.mutate,
    signOut: signOutMutation.mutate,
    signOutError: signOutMutation.error,
    isSigningUp: signUpMutation.isPending,
    isSigningOut: signOutMutation.isPending,
  };
}
