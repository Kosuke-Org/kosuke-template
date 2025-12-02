/**
 * Better Auth Configuration with Email OTP
 * See: https://www.better-auth.com/docs/plugins/email-otp
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { emailOTP, organization } from 'better-auth/plugins';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import * as schema from '@/lib/db/schema';
import { orgMemberships, organizations, users } from '@/lib/db/schema';
import { sendInvitationEmail } from '@/lib/email/invitation';
import { sendOTPEmail } from '@/lib/email/otp';
import { redis } from '@/lib/redis';

import { TEST_OTP } from '../constants';
import { isTestEmail } from '../utils';

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
  secondaryStorage: {
    get: async (key) => {
      try {
        return await redis.get(key);
      } catch (error) {
        console.error('Redis GET error:', error);
        return null;
      }
    },
    set: async (key, value, ttl) => {
      try {
        if (ttl) await redis.set(key, value, 'EX', ttl);
        else await redis.set(key, value);
      } catch (error) {
        console.error('Redis SET error:', error);
        return null;
      }
    },
    delete: async (key) => {
      try {
        await redis.del(key);
      } catch (error) {
        console.error('Redis DEL error:', error);
        return null;
      }
    },
  },
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
    storeSessionInDatabase: false,
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
      maxAge: 60 * 5, // 5 minutes - cache session in cookie to avoid Redis lookups
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
    organization({
      async sendInvitationEmail(data) {
        const [user] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, data.invitation.email))
          .limit(1);

        const acceptInvitationUrl = `/api/accept-invitation/${data.id}`;
        const inviteLink = user
          ? `${process.env.NEXT_PUBLIC_APP_URL}${acceptInvitationUrl}`
          : `${process.env.NEXT_PUBLIC_APP_URL}/sign-up?redirect=${encodeURIComponent(acceptInvitationUrl)}`;
        await sendInvitationEmail({ ...data, inviteLink });
      },
    }),
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
    // nextCookies plugin must be last
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
