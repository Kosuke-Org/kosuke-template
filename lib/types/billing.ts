import type { SubscriptionStatus, SubscriptionTierType, UserSubscription } from '@/lib/db/schema';

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
  tier: SubscriptionTierType;
  status: SubscriptionStatus | null;
  currentPeriodEnd: Date | null;
  activeSubscription: UserSubscription | null;
}

export interface CheckoutSessionParams {
  tier: SubscriptionTierType; // Lookup key (e.g., 'free_monthly', 'pro_monthly')
  userId: string;
  customerEmail: string;
  metadata?: Record<string, string>;
  redirectUrl?: string;
  cancelUrl?: string;
}

export interface OperationResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
