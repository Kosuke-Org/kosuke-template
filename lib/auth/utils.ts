import { cookies } from 'next/headers';

import { ActivityType } from '@/lib/db/schema';

import { TEST_EMAIL_SUFFIX } from './constants';
import { type CookieSameSiteType } from './index';

/**
 * Create activity log entry data
 */
export function createActivityLogData(
  userId: string,
  action: ActivityType,
  metadata?: Record<string, unknown>,
  ipAddress?: string
) {
  return {
    userId,
    action,
    metadata: metadata ? JSON.stringify(metadata) : null,
    ipAddress: ipAddress || null,
    timestamp: new Date(),
  };
}

/**
 * Sign-in Attempt Management
 * Server-side utilities for managing temporary sign-in state (Clerk-style)
 *
 * This provides a secure, server-side way to track sign-in flow state
 * without exposing email addresses in URLs or client storage.
 * Uses a single httpOnly cookie for simplicity (no database persistence needed).
 */

export const SIGN_IN_ATTEMPT_EMAIL_COOKIE = 'sign_in_attempt_email';
const SIGN_IN_ATTEMPT_EXPIRY_MINUTES = 10; // 10 minutes to complete sign-in flow

export const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
export const COOKIE_SAME_SITE = (process.env.COOKIE_SAME_SITE ?? 'lax') as CookieSameSiteType;

/**
 * Create a new sign-in attempt and store it in a secure cookie
 * Note: User existence is validated by Better Auth before calling this function
 */
export async function createSignInAttempt(email: string): Promise<string> {
  const cookieStore = await cookies();

  cookieStore.set(SIGN_IN_ATTEMPT_EMAIL_COOKIE, email, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
    maxAge: SIGN_IN_ATTEMPT_EXPIRY_MINUTES * 60,
    path: '/',
  });

  return email;
}

/**
 * Get the current sign-in attempt from the cookie
 * Returns the email if an active attempt exists, null otherwise
 */
export async function getCurrentSignInAttempt(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const email = cookieStore.get(SIGN_IN_ATTEMPT_EMAIL_COOKIE)?.value;

  if (!email) {
    return null;
  }

  return { email };
}

/**
 * Clear the sign-in attempt cookie
 * Used when user clicks "Change email", cancels the flow, or completes sign-in
 */
export async function clearSignInAttempt(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SIGN_IN_ATTEMPT_EMAIL_COOKIE);
}

export const isTestEmail = (email: string) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return isDevelopment && email.endsWith(TEST_EMAIL_SUFFIX);
};
