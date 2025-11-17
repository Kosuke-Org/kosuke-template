import { TRPCError } from '@trpc/server';
import { eq, like } from 'drizzle-orm';
import z from 'zod';

import { AUTH_ERRORS, TEST_OTP } from '@/lib/auth/constants';
import { auth } from '@/lib/auth/providers';
import {
  clearSignInAttempt,
  createSignInAttempt,
  getCurrentSignInAttempt,
  isTestEmail,
} from '@/lib/auth/utils';
import { db } from '@/lib/db/drizzle';
import { users, verifications } from '@/lib/db/schema';

import { publicProcedure, router } from '../init';

export const authRouter = router({
  requestOtp: publicProcedure
    .input(
      z.object({
        email: z.email({ message: 'Invalid email address' }),
        type: z.enum(['sign-in', 'email-verification']),
      })
    )
    .mutation(async ({ input }) => {
      const { email, type } = input;

      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (type === 'sign-in') {
        if (existingUser.length === 0) {
          // Don’t send OTP if user doesn’t exist
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: AUTH_ERRORS.USER_NOT_FOUND,
          });
        }

        // For development and test emails, use a fixed OTP for testing purposes
        if (isTestEmail(email)) {
          await db
            .update(verifications)
            .set({ value: TEST_OTP })
            .where(like(verifications.identifier, `%${email}%`));
        }

        await auth.api.sendVerificationOTP({ body: { email, type } });
        await createSignInAttempt(email);

        return { success: true };
      }

      if (type === 'email-verification') {
        // Create an unverified user - it'll be verified after the otp is verified
        if (existingUser.length === 0) {
          await db.insert(users).values({
            email,
            emailVerified: false,
            displayName: '',
          });

          await auth.api.sendVerificationOTP({ body: { email, type } });
          await createSignInAttempt(email);
        } else {
          // Don’t send OTP if user already exists
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User already exists',
          });
        }
      }

      return { success: true };
    }),

  getCurrentSignInAttempt: publicProcedure.query(async () => {
    try {
      const attempt = await getCurrentSignInAttempt();

      if (!attempt) return { success: false };

      return {
        success: true,
        email: attempt.email,
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch sign-in attempt',
        cause: error,
      });
    }
  }),

  /**
   * Clear the current sign-in attempt
   * Removes httpOnly cookie (used when user clicks "Change email" or completes sign-in)
   */
  clearSignInAttempt: publicProcedure.mutation(async () => {
    try {
      await clearSignInAttempt();
      return { success: true };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to clear sign-in attempt',
        cause: error,
      });
    }
  }),
});
