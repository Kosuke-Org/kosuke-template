/**
 * Sign-in Attempt tRPC Router
 * Server-side sign-in attempt management (Clerk-style)
 */

import { z } from 'zod';
import { publicProcedure, router } from '../init';
import {
  createSignInAttempt,
  getCurrentSignInAttempt,
  clearSignInAttempt,
} from '@/lib/auth/sign-in-attempts';
import { TRPCError } from '@trpc/server';

export const signInAttemptRouter = router({
  /**
   * Create a new sign-in attempt
   * Stores email in httpOnly cookie
   * Note: User existence is validated by Better Auth before calling this
   */
  create: publicProcedure
    .input(
      z.object({
        email: z.email({ message: 'Invalid email address' }),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await createSignInAttempt(input.email);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create sign-in attempt',
          cause: error,
        });
      }
    }),

  /**
   * Get the current sign-in attempt
   * Reads from httpOnly cookie
   */
  getCurrent: publicProcedure.query(async () => {
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
  clear: publicProcedure.mutation(async () => {
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
