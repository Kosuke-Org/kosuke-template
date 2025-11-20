'use client';

import { useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { LoaderCircle, Pencil } from 'lucide-react';

import { trpc } from '@/lib/trpc/client';

import { useAuth, useAuthActions } from '@/hooks/use-auth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

/**
 * Shared OTP Verification Component
 * Used for both sign-in and sign-up flows
 * Automatically determines redirect URL based on current route
 * Sign-up: Uses 'email-verification' to verify newly created unverified user
 * Sign-in: Uses 'sign-in' to authenticate existing user
 */
export const OTPVerification = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [otp, setOtp] = useState('');
  const { verifyOTP, sendOTP, isVerifyingOTP, isSendingOTP, verifyOTPError, clearSignInAttempt } =
    useAuthActions();
  const { isLoading: isLoadingSession } = useAuth();

  const { data, isLoading } = trpc.auth.getCurrentSignInAttempt.useQuery(undefined, {
    staleTime: 0,
  });
  const email = data?.email;

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmit();
  };

  const handleSubmit = () => {
    if (email && otp.length === 6) {
      verifyOTP({ email, otp });
    }
  };

  const handleChangeEmail = () => {
    clearSignInAttempt();
    // Automatically determine redirect URL based on current route
    const redirectUrl = pathname?.includes('/sign-up') ? '/sign-up' : '/sign-in';
    router.push(redirectUrl);
  };

  const handleResendCode = () => {
    if (email) {
      setOtp('');
      sendOTP({ email });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoaderCircle className="text-muted-foreground h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Check your email</CardTitle>
        <CardDescription className="flex flex-col gap-1">
          <span>We sent a verification code to</span>
          <div className="text-foreground flex items-center justify-center gap-1">
            <span>{email}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleChangeEmail}
            >
              <Pencil className="size-3" />
            </Button>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleFormSubmit}>
          <FieldGroup>
            <Field data-invalid={!!verifyOTPError}>
              <FieldLabel htmlFor="otp" className="justify-center">
                Verification code
              </FieldLabel>

              <InputOTP
                value={otp}
                onChange={setOtp}
                onComplete={handleSubmit}
                containerClassName="justify-center"
                pattern={REGEXP_ONLY_DIGITS}
                maxLength={6}
                required
                aria-invalid={!!verifyOTPError}
                autoFocus
              >
                {Array.from({ length: 6 }).map((_, index) => (
                  <InputOTPGroup key={index}>
                    <InputOTPSlot index={index} className="h-10 w-10" />
                  </InputOTPGroup>
                ))}
              </InputOTP>
              {verifyOTPError && (
                <FieldError errors={[{ message: verifyOTPError.message }]}>
                  {verifyOTPError.message}
                </FieldError>
              )}
            </Field>
            <Field>
              <Button
                type="submit"
                disabled={isVerifyingOTP || otp.length !== 6 || isLoadingSession}
              >
                {(isVerifyingOTP || isLoadingSession) && <LoaderCircle className="animate-spin" />}
                Continue
              </Button>
              <FieldDescription className="text-center">
                Didn&apos;t receive the code?{' '}
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isSendingOTP}
                  className="hover:text-primary underline underline-offset-4 disabled:opacity-50"
                >
                  {isSendingOTP ? 'Sending...' : 'Resend code'}
                </button>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};
