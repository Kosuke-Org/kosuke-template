import { TRPCError } from '@trpc/server';
import { like } from 'drizzle-orm';

import { AUTH_ERRORS, TEST_OTP } from '@/lib/auth/constants';
import { auth } from '@/lib/auth/providers';
import {
  clearSignInAttempt,
  createSignInAttempt,
  getCurrentSignInAttempt,
  isTestEmail,
} from '@/lib/auth/utils';
import { db } from '@/lib/db/drizzle';
import { verifications } from '@/lib/db/schema';
import { createUser, getUserByEmail } from '@/lib/services';
import { handleSignUpMarketingConsent } from '@/lib/services/notification-service';

import { publicProcedure, router } from '../init';
import { requestOtpSchema } from '../schemas/auth';

export const authRouter = router({
  requestOtp: publicProcedure
    // prettier-ignore
    .input(requestOtpSchema)
    .mutation(async ({ input }) => {
      const { email, type } = input;

      // Terms validation only for sign-up (email-verification)
      if (type === 'email-verification' && !input.terms) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You must agree to the terms of service',
        });
      }

      const existingUser = await getUserByEmail(email);

      if (type === 'sign-in') {
        if (!existingUser) {
          // Don't send OTP if user doesn't exist
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
        const marketingConsent = input.marketing ?? false;
        // Create an unverified user - it'll be verified after the otp is verified
        if (!existingUser) {
          await createUser({
            email,
            emailVerified: false,
            displayName: '',
            notificationSettings: {
              emailNotifications: false,
              marketingEmails: marketingConsent,
              securityAlerts: false,
            },
          });

          await handleSignUpMarketingConsent(email, marketingConsent);

          await auth.api.sendVerificationOTP({ body: { email, type } });
          await createSignInAttempt(email);
        } else {
          // Don't send OTP if user already exists
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
