'use client';

import { Controller, useForm } from 'react-hook-form';

import Link from 'next/link';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import { z } from 'zod';

import { signUpSchema } from '@/lib/trpc/schemas/auth';

import { useAuthActions } from '@/hooks/use-auth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

// Omit 'type' from the schema for the form, as it will be added during submission
const signUpFormSchema = signUpSchema.omit({ type: true });

type SignUpFormData = z.infer<typeof signUpFormSchema>;

export const SignUp = () => {
  const { signUp, isSigningUp } = useAuthActions();

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      email: '',
      terms: false,
      marketing: false,
    },
  });

  const handleSubmit = ({ email, terms, marketing }: SignUpFormData) => {
    signUp({ email, terms, marketing });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Welcome! Please fill in the details to get started.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <FieldGroup className="gap-5">
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    {...field}
                    required
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <div className="space-y-3">
              <Controller
                name="terms"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                    <Checkbox
                      id="terms"
                      required
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldLabel htmlFor="terms" className="font-light">
                      <span>
                        I have read and agree to the{' '}
                        <Link href="/terms" className="underline underline-offset-4">
                          terms of service.
                        </Link>
                      </span>
                    </FieldLabel>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="marketing"
                control={form.control}
                render={({ field }) => (
                  <Field orientation="horizontal">
                    <Checkbox
                      id="marketing"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <FieldLabel htmlFor="marketing" className="font-light">
                      <span>I consent to marketing use of my data.</span>
                    </FieldLabel>
                  </Field>
                )}
              />
            </div>

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
