/**
 * Better Auth Configuration with Email OTP
 * See: https://www.better-auth.com/docs/plugins/email-otp
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { emailOTP, customSession } from 'better-auth/plugins';
import { db } from '@/lib/db/drizzle';
import * as schema from '@/lib/db/schema';
import { sendOTPEmail } from '@/lib/email/otp';

/**
 * Better Auth instance with Email OTP
 * This is the main auth instance used throughout the application
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      verification: schema.verifications,
      account: schema.accounts,
    },
  }),
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  user: {
    fields: {
      name: 'displayName',
      image: 'profileImageUrl',
    },
  },
  session: {
    storeSessionInDatabase: true,
    additionalFields: {
      orgId: {
        type: 'string',
        nullable: true,
      },
      orgSlug: {
        type: 'string',
        nullable: true,
      },
    },
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes - cache session in cookie to avoid DB queries
    },
  },
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL!],
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        // Server-side check: Better Auth automatically checks if user exists when disableSignUp is true
        // If user doesn't exist and disableSignUp is true, OTP won't be sent
        await sendOTPEmail({ email, otp, type });
      },
      otpLength: 6,
      expiresIn: 300,
      sendVerificationOnSignUp: false,
      disableSignUp: true,
      allowedAttempts: 5, // Allow 5 attempts before invalidating OTP
    }),
    customSession(async ({ user, session }) => {
      // Cast session to access additional fields (they exist in DB but types aren't inferred)
      const sessionWithFields = session as typeof session & {
        orgId: string | null;
        orgSlug: string | null;
      };

      return {
        user,
        session: sessionWithFields,
      };
    }),
    // nextCookies plugin must be last
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
