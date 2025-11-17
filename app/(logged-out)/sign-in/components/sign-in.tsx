'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { ChevronRight, LoaderCircle } from 'lucide-react';

import { useAuthActions } from '@/hooks/use-auth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export const SignIn = () => {
  const [email, setEmail] = useState('');
  const { signIn, isSigningIn, signInError } = useAuthActions();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect');

  const signUpLink =
    redirectUrl && redirectUrl.startsWith('/api/accept-invitation/')
      ? `/sign-up?redirect=${redirectUrl}`
      : '/sign-up';

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    signIn({ email });
  };

  return (
    <Card className="py-8">
      <CardHeader className="px-10 text-center">
        <CardTitle className="text-lg font-bold">Sign in to Kosuke Template</CardTitle>
        <CardDescription className="text-xs">
          Welcome back! Please sign in to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="px-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Field data-invalid={!!signInError}>
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
              aria-invalid={!!signInError}
            />
            {signInError && (
              <FieldError className="text-xs" errors={[{ message: signInError.message }]}>
                {signInError.message}
              </FieldError>
            )}
          </Field>
          <Field>
            <Button type="submit" disabled={isSigningIn} className="text-xs">
              {isSigningIn && <LoaderCircle className="animate-spin" />}
              Continue
              <ChevronRight className="size-3" />
            </Button>
            <FieldDescription className="pt-6 text-center text-xs">
              Don&apos;t have an account?{' '}
              <Link
                href={signUpLink}
                className="font-bold !no-underline !underline-offset-2 hover:!underline focus:!underline"
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
