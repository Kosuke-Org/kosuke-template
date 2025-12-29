'use client';

import { Controller, useForm } from 'react-hook-form';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import { z } from 'zod';

import { signInSchema } from '@/lib/trpc/schemas/auth';

import { useAuthActions } from '@/hooks/use-auth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

// Omit 'type' from the schema for the form, as it will be added during submission
const signInFormSchema = signInSchema.omit({ type: true });

type SignInFormData = z.infer<typeof signInFormSchema>;

export const SignIn = () => {
  const { signIn, isSigningIn, signInError } = useAuthActions();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect');

  const signUpLink =
    redirectUrl && redirectUrl.startsWith('/api/accept-invitation/')
      ? `/sign-up?redirect=${redirectUrl}`
      : '/sign-up';

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: {
      email: '',
    },
  });

  const handleSubmit = ({ email }: SignInFormData) => {
    signIn({ email });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in to Kosuke Template</CardTitle>
        <CardDescription>Welcome back! Please sign in to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || !!signInError}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    {...field}
                    required
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    aria-invalid={fieldState.invalid || !!signInError}
                  />
                  {signInError ? (
                    <FieldError errors={[{ message: signInError.message }]}>
                      {signInError.message}
                    </FieldError>
                  ) : (
                    fieldState.invalid && <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

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
