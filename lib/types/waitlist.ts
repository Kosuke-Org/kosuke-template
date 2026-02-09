/**
 * Waitlist Types
 * Re-exports schema types and defines domain-specific interfaces
 */

// Re-export from schema (following the pattern of always re-exporting schema types)
export type { NewWaitlist, Waitlist } from '@/lib/db/schema';

/**
 * Waitlist Subscription - Interface for adding users to waitlist
 */
export interface WaitlistSubscription {
  email: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
}
