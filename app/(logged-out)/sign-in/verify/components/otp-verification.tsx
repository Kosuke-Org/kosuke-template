'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { ChevronRight, LoaderCircle, Pencil } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useAuthActions } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc/client';

export const OTPVerification = () => {
  const router = useRouter();
  const [otp, setOtp] = useState('');
  const { verifyOTP, sendOTP, isVerifyingOTP, isSendingOTP, verifyOTPError, clearSignInAttempt } =
    useAuthActions();

  const { data, isLoading } = trpc.signInAttempt.getCurrent.useQuery(undefined, {});
  const email = data?.email;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (email && otp.length === 6) {
      verifyOTP({ email, otp });
    }
  };

  const handleChangeEmail = async () => {
    await clearSignInAttempt();
    router.push('/sign-in');
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
          <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!email) {
    return null;
  }

  return (
    <Card className="py-8">
      <CardHeader className="text-center px-10">
        <CardTitle className="text-lg font-bold">Check your email</CardTitle>
        <CardDescription className="text-xs flex flex-col gap-1">
          <span>We sent a verification code to</span>
          <div className="font-medium text-foreground flex justify-center items-center">
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field data-invalid={!!verifyOTPError} className="text-center">
            <FieldLabel htmlFor="otp" className="text-xs justify-center">
              Verification code
            </FieldLabel>

            <InputOTP
              value={otp}
              onChange={setOtp}
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
            <Button type="submit" disabled={isVerifyingOTP || otp.length !== 6}>
              {isVerifyingOTP && <LoaderCircle className="animate-spin" />}
              Continue
              <ChevronRight />
            </Button>
          </Field>

          <FieldDescription className="text-center text-xs pt-2">
            Didn&apos;t receive the code?{' '}
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isSendingOTP}
              className="font-bold !underline-offset-2 !no-underline hover:!underline focus:!underline disabled:opacity-50"
            >
              {isSendingOTP ? 'Sending...' : 'Resend code'}
            </button>
          </FieldDescription>
        </form>
      </CardContent>
    </Card>
  );
};
