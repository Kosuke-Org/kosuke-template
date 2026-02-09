/**
 * Waitlist Service
 * Business logic for waitlist subscriptions
 */
import { count, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { type NewWaitlist, type Waitlist, waitlist } from '@/lib/db/schema';
import { ERRORS, ERROR_MESSAGES } from '@/lib/services/constants';
import type { WaitlistSubscription } from '@/lib/types/waitlist';

/**
 * Add email to waitlist
 * Handles duplicate emails gracefully by checking existence first
 */
export async function addToWaitlist(
  params: WaitlistSubscription
): Promise<{ waitlistEntry: Waitlist; isNewSubscriber: boolean }> {
  const { email, ipAddress, userAgent, referrer } = params;

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    throw new Error('Invalid email address', {
      cause: ERRORS.BAD_REQUEST,
    });
  }

  // Check if email already exists
  const existingEntry = await isEmailOnWaitlist(email);
  if (existingEntry) {
    return {
      waitlistEntry: existingEntry,
      isNewSubscriber: false,
    };
  }

  // Create new waitlist entry
  const newEntry: NewWaitlist = {
    email: email.toLowerCase().trim(),
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    referrer: referrer || null,
    confirmed: false,
    confirmedAt: null,
  };

  try {
    const [waitlistEntry] = await db.insert(waitlist).values(newEntry).returning();

    if (!waitlistEntry) {
      throw new Error('Failed to create waitlist entry', {
        cause: ERRORS.BAD_REQUEST,
      });
    }

    return {
      waitlistEntry,
      isNewSubscriber: true,
    };
  } catch (error) {
    // Handle race condition - entry was created between check and insert
    if (error instanceof Error && error.message.includes('unique')) {
      const entry = await isEmailOnWaitlist(email);
      if (entry) {
        return {
          waitlistEntry: entry,
          isNewSubscriber: false,
        };
      }
    }

    throw new Error(error instanceof Error ? error.message : 'Failed to add to waitlist', {
      cause: ERRORS.BAD_REQUEST,
    });
  }
}

/**
 * Get total number of waitlist subscribers
 */
export async function getWaitlistCount(): Promise<number> {
  const [result] = await db.select({ count: count() }).from(waitlist);

  return result?.count ?? 0;
}

/**
 * Check if email is already on waitlist
 * Returns the waitlist entry if found, null otherwise
 */
export async function isEmailOnWaitlist(email: string): Promise<Waitlist | null> {
  const [entry] = await db
    .select()
    .from(waitlist)
    .where(eq(waitlist.email, email.toLowerCase().trim()))
    .limit(1);

  return entry ?? null;
}
