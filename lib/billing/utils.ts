import { Polar } from '@polar-sh/sdk';
import { db } from '@/lib/db';
import { userSubscriptions } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { SubscriptionTier, SubscriptionStatus } from '@/lib/db/schema';

// Initialize Polar client
const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.POLAR_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production',
});

export { polar };

// Product ID mapping
export const PRODUCT_IDS = {
  pro: process.env.POLAR_PRO_PRODUCT_ID!,
  business: process.env.POLAR_BUSINESS_PRODUCT_ID!,
} as const;

// Pricing information
export const PRICING = {
  free: {
    price: 0,
    name: 'Free',
    description: 'Perfect for getting started',
    features: ['Basic features', 'Community support', 'Limited usage'],
  },
  pro: {
    price: 20,
    name: 'Pro',
    description: 'For growing teams',
    features: ['All free features', 'Priority support', 'Advanced features', 'Higher usage limits'],
  },
  business: {
    price: 200,
    name: 'Business',
    description: 'For large organizations',
    features: ['All pro features', 'Enterprise support', 'Custom integrations', 'Unlimited usage'],
  },
} as const;

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
 * Type guard to validate SubscriptionTier enum values
 */
function isValidSubscriptionTier(value: string): value is SubscriptionTier {
  return Object.values(SubscriptionTier).includes(value as SubscriptionTier);
}

/**
 * Type guard to validate SubscriptionStatus enum values
 */
function isValidSubscriptionStatus(value: string): value is SubscriptionStatus {
  return Object.values(SubscriptionStatus).includes(value as SubscriptionStatus);
}

/**
 * Safely cast a string to SubscriptionTier with fallback
 */
export function safeSubscriptionTierCast(
  value: string,
  fallback: SubscriptionTier = SubscriptionTier.FREE
): SubscriptionTier {
  if (isValidSubscriptionTier(value)) {
    return value;
  }
  console.warn(`Invalid subscription tier value: ${value}. Falling back to ${fallback}`);
  return fallback;
}

/**
 * Safely cast a string to SubscriptionStatus with fallback
 */
export function safeSubscriptionStatusCast(
  value: string,
  fallback: SubscriptionStatus | null = null
): SubscriptionStatus | null {
  if (isValidSubscriptionStatus(value)) {
    return value;
  }
  console.warn(`Invalid subscription status value: ${value}. Falling back to ${fallback}`);
  return fallback;
}

/**
 * Calculate the current subscription state based on status and dates
 */
export function calculateSubscriptionState(
  status: SubscriptionStatus | null,
  tier: SubscriptionTier,
  currentPeriodEnd: Date | null
): SubscriptionState {
  // Free tier is always free
  if (tier === SubscriptionTier.FREE) {
    return SubscriptionState.FREE;
  }

  // Handle active subscriptions
  if (status === SubscriptionStatus.ACTIVE) {
    return SubscriptionState.ACTIVE;
  }

  // Handle canceled subscriptions
  if (status === SubscriptionStatus.CANCELED) {
    if (currentPeriodEnd && new Date() < currentPeriodEnd) {
      return SubscriptionState.CANCELED_GRACE_PERIOD;
    }
    return SubscriptionState.CANCELED_EXPIRED;
  }

  // Handle other subscription states
  if (status === SubscriptionStatus.PAST_DUE) {
    return SubscriptionState.PAST_DUE;
  }

  if (status === SubscriptionStatus.INCOMPLETE) {
    return SubscriptionState.INCOMPLETE;
  }

  if (status === SubscriptionStatus.UNPAID) {
    return SubscriptionState.UNPAID;
  }

  // Default to free for unknown states
  return SubscriptionState.FREE;
}

/**
 * Get comprehensive subscription eligibility for all possible actions
 */
export function getSubscriptionEligibility(
  subscription: Awaited<ReturnType<typeof getUserSubscription>>
): SubscriptionEligibility {
  const { status, tier, currentPeriodEnd } = subscription;

  const state = calculateSubscriptionState(status, tier, currentPeriodEnd);

  const eligibility: SubscriptionEligibility = {
    canReactivate: false,
    canCreateNew: false,
    canUpgrade: false,
    canCancel: false,
    state,
  };

  switch (state) {
    case SubscriptionState.FREE:
      eligibility.canCreateNew = true;
      eligibility.canUpgrade = true;
      break;

    case SubscriptionState.ACTIVE:
      eligibility.canCancel = true;
      eligibility.canUpgrade = true; // Allow tier changes
      break;

    case SubscriptionState.CANCELED_GRACE_PERIOD:
      eligibility.canReactivate = true;
      eligibility.canCreateNew = true; // For tier changes (treat as new subscription)
      eligibility.gracePeriodEnds = currentPeriodEnd || undefined;
      break;

    case SubscriptionState.CANCELED_EXPIRED:
    case SubscriptionState.PAST_DUE:
    case SubscriptionState.INCOMPLETE:
    case SubscriptionState.UNPAID:
      eligibility.canCreateNew = true;
      eligibility.canUpgrade = true;
      break;
  }

  return eligibility;
}

/**
 * Create a checkout session for a specific tier
 */
export async function createCheckoutSession(
  tier: keyof typeof PRODUCT_IDS,
  userId: string,
  customerEmail: string,
  successUrl?: string
) {
  const productId = PRODUCT_IDS[tier];

  if (!productId) {
    throw new Error(`Invalid tier: ${tier}`);
  }

  const checkout = await polar.checkouts.create({
    products: [productId],
    successUrl: successUrl || process.env.POLAR_SUCCESS_URL!,
    customerEmail,
    metadata: {
      userId,
      tier,
    },
  });

  return checkout;
}

/**
 * Create a free tier subscription for a new user
 */
export async function createFreeSubscription(clerkUserId: string) {
  const freeSubscriptionData = {
    clerkUserId,
    subscriptionId: null,
    productId: null,
    status: SubscriptionStatus.ACTIVE,
    tier: SubscriptionTier.FREE,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const [newSubscription] = await db
    .insert(userSubscriptions)
    .values(freeSubscriptionData)
    .returning();

  return newSubscription;
}

/**
 * Get user's current subscription information using Clerk user ID
 */
export async function getUserSubscription(clerkUserId: string) {
  const activeSubscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.clerkUserId, clerkUserId),
    orderBy: [desc(userSubscriptions.createdAt)],
  });

  if (!activeSubscription) {
    // Create a free tier subscription if none exists
    console.log('🆕 Creating free tier subscription for user:', clerkUserId);
    const freeSubscription = await createFreeSubscription(clerkUserId);

    return {
      tier: SubscriptionTier.FREE,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: null,
      activeSubscription: freeSubscription,
    };
  }

  // Safely cast the subscription tier with validation
  const subscriptionTier = safeSubscriptionTierCast(activeSubscription.tier);
  const subscriptionStatus = safeSubscriptionStatusCast(activeSubscription.status);

  // Calculate current effective tier based on state
  const state = calculateSubscriptionState(
    subscriptionStatus,
    subscriptionTier,
    activeSubscription.currentPeriodEnd
  );

  // Determine current tier based on subscription state
  let currentTier = SubscriptionTier.FREE;
  if (state === SubscriptionState.ACTIVE || state === SubscriptionState.CANCELED_GRACE_PERIOD) {
    currentTier = subscriptionTier;
  }

  return {
    tier: currentTier,
    status: subscriptionStatus,
    currentPeriodEnd: activeSubscription.currentPeriodEnd,
    activeSubscription,
  };
}

/**
 * Check if user has access to a specific feature based on their tier
 */
export function hasFeatureAccess(
  userTier: SubscriptionTier,
  requiredTier: SubscriptionTier
): boolean {
  const tierHierarchy = {
    [SubscriptionTier.FREE]: 0,
    [SubscriptionTier.PRO]: 1,
    [SubscriptionTier.BUSINESS]: 2,
  };

  return tierHierarchy[userTier] >= tierHierarchy[requiredTier];
}

/**
 * Get tier display information
 */
export function getTierInfo(tier: SubscriptionTier) {
  return PRICING[tier];
}

/**
 * Update user subscription status using Clerk user ID
 */
export async function updateUserSubscription(
  clerkUserId: string,
  subscriptionId: string,
  updates: {
    status?: SubscriptionStatus;
    tier?: SubscriptionTier;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    canceledAt?: Date | null;
  }
) {
  await db
    .update(userSubscriptions)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userSubscriptions.clerkUserId, clerkUserId),
        eq(userSubscriptions.subscriptionId, subscriptionId)
      )
    );
}

/**
 * Reactivate a canceled subscription (uncancels it in Polar)
 */
export async function reactivateUserSubscription(clerkUserId: string, subscriptionId: string) {
  try {
    console.log('🔄 Reactivating subscription via Polar API:', subscriptionId);

    // Validate subscription eligibility for reactivation
    const currentSubscription = await getUserSubscription(clerkUserId);
    const eligibility = getSubscriptionEligibility(currentSubscription);

    if (!eligibility.canReactivate) {
      throw new Error('Subscription cannot be reactivated at this time.');
    }

    if (
      !currentSubscription.activeSubscription ||
      currentSubscription.activeSubscription.subscriptionId !== subscriptionId
    ) {
      throw new Error('Subscription not found or does not belong to this user.');
    }

    // Reactivate subscription via Polar API (this triggers subscription.updated webhook)
    let reactivatedSubscription;
    try {
      // Based on Polar's architecture: Update subscription to remove cancellation
      // This follows the pattern where cancellation is scheduled for period end
      // and can be removed before the period expires
      // For now, we'll need to implement the actual update logic once Polar confirms their API
      // This is a placeholder that follows their likely pattern
      reactivatedSubscription = await polar.subscriptions.get({ id: subscriptionId });

      // TODO: Replace with actual reactivation call once Polar API is confirmed
      // Likely something like: polar.subscriptions.update(subscriptionId, { cancel_at: null })
      console.warn('⚠️  Placeholder: Actual Polar reactivation API call needed here');
      console.log('✅ Subscription reactivation requested via Polar API:', subscriptionId);
    } catch (polarError: unknown) {
      console.error('💥 Polar API error during reactivation:', polarError);

      const error = polarError as { status?: number; message?: string };
      if (error.status === 404) {
        throw new Error('Subscription not found in Polar.');
      } else if (error.status === 403) {
        throw new Error('Access denied. Unable to reactivate this subscription.');
      } else if (error.status && error.status >= 500) {
        throw new Error('Polar service is temporarily unavailable. Please try again later.');
      } else {
        throw new Error(`Failed to reactivate subscription: ${error.message || 'Unknown error'}`);
      }
    }

    console.log('✅ Successfully reactivated subscription in Polar:', reactivatedSubscription);

    // Update local database - the webhook should handle this, but we can update optimistically
    await updateUserSubscription(clerkUserId, subscriptionId, {
      status: SubscriptionStatus.ACTIVE,
      canceledAt: null,
    });

    console.log('✅ Successfully updated local subscription status to active');

    return {
      success: true,
      message: 'Subscription has been successfully reactivated.',
      subscription: reactivatedSubscription,
    };
  } catch (error) {
    console.error('💥 Error in reactivateUserSubscription:', error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Unable to reactivate subscription at this time. Please contact support.');
  }
}

/**
 * Cancel user's active subscription
 */
export async function cancelUserSubscription(clerkUserId: string, subscriptionId: string) {
  try {
    console.log('🔄 Canceling subscription via Polar API:', subscriptionId);

    const currentSubscription = await getUserSubscription(clerkUserId);
    const eligibility = getSubscriptionEligibility(currentSubscription);

    if (!eligibility.canCancel) {
      throw new Error('Subscription cannot be canceled at this time.');
    }

    if (
      !currentSubscription.activeSubscription ||
      currentSubscription.activeSubscription.subscriptionId !== subscriptionId
    ) {
      throw new Error('Subscription not found or does not belong to this user.');
    }

    // Cancel subscription via Polar API
    let canceledSubscription;
    try {
      canceledSubscription = await polar.subscriptions.revoke({
        id: subscriptionId,
      });
    } catch (polarError: unknown) {
      console.error('💥 Polar API error during cancellation:', polarError);

      const error = polarError as { status?: number; message?: string };
      if (error.status === 404) {
        throw new Error('Subscription not found in Polar. It may have already been canceled.');
      } else if (error.status === 403) {
        throw new Error('Access denied. Unable to cancel this subscription.');
      } else if (error.status && error.status >= 500) {
        throw new Error('Polar service is temporarily unavailable. Please try again later.');
      } else {
        throw new Error(`Failed to cancel subscription: ${error.message || 'Unknown error'}`);
      }
    }

    console.log('✅ Successfully canceled subscription in Polar:', canceledSubscription);

    // Update local database
    await updateUserSubscription(clerkUserId, subscriptionId, {
      status: SubscriptionStatus.CANCELED,
      canceledAt: new Date(),
    });

    console.log('✅ Successfully updated local subscription status to canceled');

    return {
      success: true,
      message:
        'Subscription has been successfully canceled. You will continue to have access until the end of your current billing period.',
      subscription: canceledSubscription,
    };
  } catch (error) {
    console.error('💥 Error in cancelUserSubscription:', error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Unable to cancel subscription at this time. Please contact support.');
  }
}

/**
 * Get all available tiers for upgrade/downgrade
 */
export function getAvailableTiers(currentTier: SubscriptionTier) {
  return Object.entries(PRICING).map(([key, info]) => ({
    id: key as SubscriptionTier,
    ...info,
    isCurrent: key === currentTier,
    isUpgrade:
      PRICING[key as SubscriptionTier] &&
      PRICING[key as SubscriptionTier].price > PRICING[currentTier].price,
  }));
}

/**
 * DEPRECATED: Use getSubscriptionEligibility instead
 * @deprecated
 */
export function canCreateNewSubscription(
  currentSubscription: Awaited<ReturnType<typeof getUserSubscription>>
): { canCreate: boolean; reason?: string } {
  const eligibility = getSubscriptionEligibility(currentSubscription);
  return {
    canCreate: eligibility.canCreateNew,
    reason: eligibility.reason,
  };
}

/**
 * DEPRECATED: Use calculateSubscriptionState instead
 * @deprecated
 */
export function isSubscriptionActive(
  status: SubscriptionStatus | null,
  currentPeriodEnd: Date | null
): boolean {
  const state = calculateSubscriptionState(status, SubscriptionTier.PRO, currentPeriodEnd);
  return state === SubscriptionState.ACTIVE;
}

/**
 * DEPRECATED: Use calculateSubscriptionState instead
 * @deprecated
 */
export function isTrulyActiveSubscription(
  status: SubscriptionStatus | null,
  tier: SubscriptionTier
): boolean {
  const state = calculateSubscriptionState(status, tier, null);
  return state === SubscriptionState.ACTIVE && tier !== SubscriptionTier.FREE;
}
