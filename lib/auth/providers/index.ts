/**
 * Better Auth Configuration with Email OTP
 * See: https://www.better-auth.com/docs/plugins/email-otp
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { emailOTP, organization } from 'better-auth/plugins';

import { db } from '@/lib/db/drizzle';
import * as schema from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { organizations, orgMemberships } from '@/lib/db/schema';
import { sendOTPEmail } from '@/lib/email/otp';
import { isTestEmail } from '../utils';
import { TEST_OTP } from '../constants';

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
      organization: schema.organizations,
      member: schema.orgMemberships,
      invitation: schema.invitations,
    },
  }),
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const [membership] = await db
            .select({
              organizationId: orgMemberships.organizationId,
              organizationSlug: organizations.slug,
            })
            .from(orgMemberships)
            .innerJoin(organizations, eq(orgMemberships.organizationId, organizations.id))
            .where(eq(orgMemberships.userId, session.userId))
            .orderBy(desc(orgMemberships.createdAt))
            .limit(1);

          return {
            data: {
              ...session,
              activeOrganizationId: membership?.organizationId ?? null,
              activeOrganizationSlug: membership?.organizationSlug ?? null,
            },
          };
        },
      },
      update: {
        before: async (session) => {
          if (session.activeOrganizationId !== undefined) {
            const orgId = session.activeOrganizationId as string | null | undefined;
            if (orgId) {
              const [org] = await db
                .select({ slug: organizations.slug })
                .from(organizations)
                .where(eq(organizations.id, orgId))
                .limit(1);

              return {
                data: {
                  ...session,
                  activeOrganizationSlug: org?.slug ?? null,
                },
              };
            } else {
              return {
                data: {
                  ...session,
                  activeOrganizationSlug: null,
                },
              };
            }
          }

          return { data: session };
        },
      },
    },
  },
  user: {
    // map custom fields displayName and profileImageUrl to match what's expected by Better Auth
    fields: {
      name: 'displayName',
      image: 'profileImageUrl',
    },
  },
  session: {
    storeSessionInDatabase: true,
    additionalFields: {
      activeOrganizationId: {
        type: 'string',
        nullable: true,
      },
      activeOrganizationSlug: {
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
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
  },
  plugins: [
    organization(),
    emailOTP({
      overrideDefaultEmailVerification: true,
      sendVerificationOTP: async ({ email, otp, type }) => {
        // do nothing — handled by tRPC
        await sendOTPEmail({ email, otp, type });
      },
      generateOTP(data) {
        if (isTestEmail(data.email)) return TEST_OTP;

        // else generate a random OTP
      },
      otpLength: 6,
      expiresIn: 300,
      sendVerificationOnSignUp: true,
      disableSignUp: true, // Prevent automatic user creation during sign-in
      allowedAttempts: 5, // Allow 5 attempts before invalidating OTP
    }),
    // customSession(async ({ user, session }) => {
    //   // Cast session to access additional fields (they exist in DB but types aren't inferred)
    //   const sessionWithFields = session as typeof session & {
    //     activeOrganizationId: string | null;
    //     activeOrganizationSlug: string | null;
    //   };

    //   return {
    //     user,
    //     session: sessionWithFields,
    //   };
    // }),
    // nextCookies plugin must be last
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
