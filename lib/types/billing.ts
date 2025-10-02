import type { UserSubscription, SubscriptionTier, SubscriptionStatus } from '@/lib/db/schema';

// Base types extending schema
export type { UserSubscription, SubscriptionTier, SubscriptionStatus } from '@/lib/db/schema';

// Enhanced subscription state enum for better state management
export enum SubscriptionState {
  FREE = 'free',
  ACTIVE = 'active',
  CANCELED_GRACE_PERIOD = 'canceled_grace_period',
  CANCELED_EXPIRED = 'canceled_expired',
  PAST_DUE = 'past_due',
  INCOMPLETE = 'incomplete',
  UNPAID = 'unpaid',
}

// Subscription eligibility and operations
export interface SubscriptionEligibility {
  canReactivate: boolean;
  canCreateNew: boolean;
  canUpgrade: boolean;
  canCancel: boolean;
  state: SubscriptionState;
  gracePeriodEnds?: Date;
  reason?: string;
}

export interface UserSubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus | null;
  currentPeriodEnd: Date | null;
  activeSubscription: UserSubscription | null;
}

export interface SubscriptionUpdateParams {
  status?: SubscriptionStatus;
  tier?: SubscriptionTier;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  canceledAt?: Date | null;
}

export interface CheckoutSessionParams {
  tier: keyof typeof import('@/lib/billing/config').PRODUCT_IDS;
  userId: string;
  customerEmail: string;
  successUrl?: string;
  metadata?: Record<string, string>;
}

export interface OperationResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Subscription action response types (from hooks)
export interface UpgradeResponse {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
}

// Subscription information types (merged from use-subscription-data)
export interface SubscriptionInfo {
  tier: string;
  status: string;
  currentPeriodEnd?: string;
  activeSubscription?: UserSubscription | null;
  user?: {
    localId: string;
    clerkUserId: string;
  };
}
