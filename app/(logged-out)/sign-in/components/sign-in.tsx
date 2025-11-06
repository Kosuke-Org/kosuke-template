'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ChevronRight, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthActions } from '@/hooks/use-auth';

export const SignIn = () => {
  const [email, setEmail] = useState('');
  const { sendOTP, isSendingOTP, sendOTPError } = useAuthActions();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendOTP({ email });
  };

  return (
    <Card className="py-8">
      <CardHeader className="text-center px-10">
        <CardTitle className="text-lg font-bold">Sign in to Kosuke Template</CardTitle>
        <CardDescription className="text-xs">
          Welcome back! Please sign in to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="px-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Field data-invalid={!!sendOTPError}>
            <FieldLabel htmlFor="email" className="text-xs">
              Email address
            </FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              className="!text-xs"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-invalid={!!sendOTPError}
            />
            {sendOTPError && (
              <FieldError className="text-xs" errors={[{ message: sendOTPError.message }]}>
                {sendOTPError.message}
              </FieldError>
            )}
          </Field>
          <Field>
            <Button type="submit" disabled={isSendingOTP} className="text-xs">
              {isSendingOTP && <LoaderCircle className="animate-spin" />}
              Continue
              <ChevronRight className="size-3" />
            </Button>
            <FieldDescription className="text-center text-xs pt-6">
              Don&apos;t have an account?{' '}
              <Link
                href="/sign-up"
                className="font-bold !underline-offset-2 !no-underline hover:!underline focus:!underline"
              >
                Sign up
              </Link>
            </FieldDescription>
          </Field>
        </form>
      </CardContent>
    </Card>
  );
};
