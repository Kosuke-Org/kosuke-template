'use client';

import { useState } from 'react';

import Link from 'next/link';

import { LoaderCircle } from 'lucide-react';

import { useAuthActions } from '@/hooks/use-auth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export const SignUp = () => {
  const [email, setEmail] = useState('');
  const { signUp, isSigningUp, signUpError } = useAuthActions();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    signUp({ email });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Welcome! Please fill in the details to get started.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={!!signUpError}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={!!signUpError}
              />
              {signUpError && (
                <FieldError errors={[{ message: signUpError.message }]}>
                  {signUpError.message}
                </FieldError>
              )}
            </Field>
            <Field>
              <Button type="submit" disabled={isSigningUp}>
                {isSigningUp && <LoaderCircle className="animate-spin" />}
                Continue
              </Button>
              <FieldDescription className="text-center">
                Already have an account?{' '}
                <Link href="/sign-in" className="underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};
