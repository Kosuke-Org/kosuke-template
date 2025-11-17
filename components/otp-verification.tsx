'use client';

import { useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { ChevronRight, LoaderCircle, Pencil } from 'lucide-react';

import { trpc } from '@/lib/trpc/client';

import { useAuth, useAuthActions } from '@/hooks/use-auth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
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
      <Card className="py-8">
        <CardContent className="flex items-center justify-center py-12">
          <LoaderCircle className="text-muted-foreground h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="py-8">
      <CardHeader className="px-10 text-center">
        <CardTitle className="text-lg font-bold">Check your email</CardTitle>
        <CardDescription className="flex flex-col gap-1 text-xs">
          <span>We sent a verification code to</span>
          <div className="text-foreground flex items-center justify-center font-medium">
            <span>{email}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-auto p-1"
              onClick={handleChangeEmail}
            >
              <Pencil className="size-3" />
            </Button>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="px-10">
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <Field data-invalid={!!verifyOTPError} className="text-center">
            <FieldLabel htmlFor="otp" className="justify-center text-xs">
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
                  <InputOTPSlot index={index} />
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
            <Button type="submit" disabled={isVerifyingOTP || otp.length !== 6 || isLoadingSession}>
              {(isVerifyingOTP || isLoadingSession) && <LoaderCircle className="animate-spin" />}
              Continue
              <ChevronRight />
            </Button>
          </Field>

          <FieldDescription className="pt-2 text-center text-xs">
            Didn&apos;t receive the code?{' '}
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isSendingOTP}
              className="font-bold !no-underline !underline-offset-2 hover:!underline focus:!underline disabled:opacity-50"
            >
              {isSendingOTP ? 'Sending...' : 'Resend code'}
            </button>
          </FieldDescription>
        </form>
      </CardContent>
    </Card>
  );
};
