import type { UserSubscription, SubscriptionTier, SubscriptionStatus } from '@/lib/db/schema';

// Base types extending schema
export type { UserSubscription, SubscriptionTier, SubscriptionStatus } from '@/lib/db/schema';

// Enhanced subscription state enum for better state management (migrated from lib/billing/types.ts)
export enum SubscriptionState {
  FREE = 'free',
  ACTIVE = 'active',
  CANCELED_GRACE_PERIOD = 'canceled_grace_period',
  CANCELED_EXPIRED = 'canceled_expired',
  PAST_DUE = 'past_due',
  INCOMPLETE = 'incomplete',
  UNPAID = 'unpaid',
}

// Subscription eligibility and operations (migrated from lib/billing/types.ts)
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

export interface SubscriptionWithUser extends UserSubscription {
  user: {
    id: number;
    email: string;
    displayName: string | null;
  };
}

export interface SubscriptionSummary
  extends Pick<UserSubscription, 'id' | 'tier' | 'status' | 'currentPeriodEnd'> {
  daysRemaining: number;
  isExpiringSoon: boolean;
}

// Subscription operation types
export interface CreateSubscriptionData {
  clerkUserId: string;
  subscriptionId: string;
  productId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}

export interface UpdateSubscriptionData
  extends Partial<
    Pick<
      UserSubscription,
      'status' | 'tier' | 'currentPeriodStart' | 'currentPeriodEnd' | 'canceledAt'
    >
  > {
  updatedAt?: Date;
}

// Subscription eligibility and state
export interface SubscriptionEligibility {
  canReactivate: boolean;
  canCreateNew: boolean;
  canUpgrade: boolean;
  canCancel: boolean;
  state: SubscriptionState;
  gracePeriodEnds?: Date;
  reason?: string;
}

// Checkout and billing operation types
export interface CheckoutSessionParams {
  tier: keyof typeof import('@/lib/billing/config').PRODUCT_IDS;
  userId: string;
  customerEmail: string;
  successUrl?: string;
  metadata?: Record<string, string>;
}

// Alias for backward compatibility
export type BillingOperationResult<T = unknown> = OperationResult<T>;

// Subscription statistics and analytics
export interface BillingStats {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  activeSubscriptions: number;
  churnRate: number;
  conversionRate: number;
}

export interface SubscriptionMetrics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  canceledSubscriptions: number;
  freeUsers: number;
  proUsers: number;
  businessUsers: number;
  period: 'day' | 'week' | 'month' | 'year';
}

export interface RevenueSummary {
  amount: number;
  currency: string;
  period: string;
  tier: SubscriptionTier;
  subscriptionCount: number;
}

// Polar integration types
export interface PolarSubscriptionData {
  id: string;
  status: string;
  product_id: string;
  customer_id: string;
  current_period_start: string;
  current_period_end: string;
  canceled_at?: string;
  metadata?: Record<string, unknown>;
}

export interface PolarWebhookEvent {
  type: string;
  data: PolarSubscriptionData;
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
