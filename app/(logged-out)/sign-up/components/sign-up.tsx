'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ChevronRight, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthActions } from '@/hooks/use-auth';

export const SignUp = () => {
  const [email, setEmail] = useState('');
  const { signUp, isSigningUp, signUpError } = useAuthActions();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    signUp({ email });
  };

  return (
    <Card className="py-8">
      <CardHeader className="text-center px-10">
        <CardTitle className="text-lg font-bold">Create your account</CardTitle>
        <CardDescription className="text-xs">
          Welcome! Please fill in the details to get started.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Field data-invalid={!!signUpError}>
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
              aria-invalid={!!signUpError}
            />
            {signUpError && (
              <FieldError className="text-xs" errors={[{ message: signUpError.message }]}>
                {signUpError.message}
              </FieldError>
            )}
          </Field>
          <Field>
            <Button type="submit" disabled={isSigningUp} className="text-xs">
              {isSigningUp && <LoaderCircle className="animate-spin" />}
              Continue
              <ChevronRight className="size-3" />
            </Button>
            <FieldDescription className="text-center text-xs pt-6">
              Already have an account?{' '}
              <Link
                href="/sign-in"
                className="font-bold !underline-offset-2 !no-underline hover:!underline focus:!underline"
              >
                Sign in
              </Link>
            </FieldDescription>
          </Field>
        </form>
      </CardContent>
    </Card>
  );
};
