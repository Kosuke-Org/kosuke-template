import { SubscriptionTier, SubscriptionStatus, UserSubscription } from '@/lib/db/schema';

/**
 * Billing types and enums
 * Centralized type definitions for the billing system
 */

/**
 * Enhanced subscription state enum for better state management
 */
export enum SubscriptionState {
  FREE = 'free',
  ACTIVE = 'active',
  CANCELED_GRACE_PERIOD = 'canceled_grace_period',
  CANCELED_EXPIRED = 'canceled_expired',
  PAST_DUE = 'past_due',
  INCOMPLETE = 'incomplete',
  UNPAID = 'unpaid',
}

/**
 * Subscription eligibility for different actions
 */
export interface SubscriptionEligibility {
  canReactivate: boolean;
  canCreateNew: boolean;
  canUpgrade: boolean;
  canCancel: boolean;
  state: SubscriptionState;
  gracePeriodEnds?: Date;
  reason?: string;
}

/**
 * User subscription information returned by getUserSubscription
 */
export interface UserSubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus | null;
  currentPeriodEnd: Date | null;
  activeSubscription: UserSubscription | null;
}

/**
 * Subscription update parameters
 */
export interface SubscriptionUpdateParams {
  status?: SubscriptionStatus;
  tier?: SubscriptionTier;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  canceledAt?: Date | null;
}

/**
 * Checkout session parameters
 */
export interface CheckoutSessionParams {
  tier: keyof typeof import('./config').PRODUCT_IDS;
  userId: string;
  customerEmail: string;
  successUrl?: string;
  metadata?: Record<string, string>;
}

/**
 * Operation result interface for async operations
 */
export interface OperationResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Re-export schema types for convenience
 */
export { SubscriptionTier, SubscriptionStatus } from '@/lib/db/schema';
