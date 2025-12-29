import { z } from 'zod';

export const signInSchema = z.object({
  email: z.email({ message: 'Invalid email address' }),
  type: z.literal('sign-in'),
});

export const signUpSchema = z.object({
  email: z.email({ message: 'Invalid email address' }),
  type: z.literal('email-verification'),
  terms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms of service',
  }),
  marketing: z.boolean().optional(),
});

export const requestOtpSchema = z.discriminatedUnion('type', [signInSchema, signUpSchema]);
