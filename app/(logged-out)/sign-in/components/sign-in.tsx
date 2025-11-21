'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { LoaderCircle } from 'lucide-react';

import { useAuthActions } from '@/hooks/use-auth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
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
    <Card>
      <CardHeader>
        <CardTitle>Sign in to Kosuke Template</CardTitle>
        <CardDescription>Welcome back! Please sign in to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={!!signInError}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={!!signInError}
              />
              {signInError && (
                <FieldError errors={[{ message: signInError.message }]}>
                  {signInError.message}
                </FieldError>
              )}
            </Field>
            <Field>
              <Button type="submit" disabled={isSigningIn}>
                {isSigningIn && <LoaderCircle className="animate-spin" />}
                Continue
              </Button>
              <FieldDescription className="text-center">
                Don&apos;t have an account?{' '}
                <Link href={signUpLink} className="underline-offset-4 hover:underline">
                  Sign up
                </Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};
