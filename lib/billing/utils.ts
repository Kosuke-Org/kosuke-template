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
export async function createFreeSubscription(stackAuthUserId: string) {
  const freeSubscriptionData = {
    stackAuthUserId,
    subscriptionId: null,
    productId: null,
    status: 'active' as const,
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
 * Get user's current subscription information using StackAuth UUID
 */
export async function getUserSubscription(stackAuthUserId: string) {
  const activeSubscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.stackAuthUserId, stackAuthUserId),
    orderBy: [desc(userSubscriptions.createdAt)],
  });

  if (!activeSubscription) {
    // Create a free tier subscription if none exists
    console.log('🆕 Creating free tier subscription for user:', stackAuthUserId);
    const freeSubscription = await createFreeSubscription(stackAuthUserId);

    return {
      tier: SubscriptionTier.FREE,
      status: 'active' as const,
      currentPeriodEnd: null,
      activeSubscription: freeSubscription,
    };
  }

  // Safely cast the subscription tier with validation
  const subscriptionTier = safeSubscriptionTierCast(activeSubscription.tier);

  // Safely cast the subscription status with validation
  const subscriptionStatus = safeSubscriptionStatusCast(activeSubscription.status);

  // Determine current tier based on subscription status and period
  let currentTier = SubscriptionTier.FREE;

  if (subscriptionStatus === SubscriptionStatus.ACTIVE) {
    currentTier = subscriptionTier;
  } else if (
    activeSubscription.currentPeriodEnd &&
    new Date() < activeSubscription.currentPeriodEnd
  ) {
    // Still in grace period
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
 * Check if subscription is active and not expired
 */
export function isSubscriptionActive(
  status: SubscriptionStatus | null,
  currentPeriodEnd: Date | null
): boolean {
  if (!status || status !== SubscriptionStatus.ACTIVE) {
    return false;
  }

  if (!currentPeriodEnd) {
    return false;
  }

  return new Date() < currentPeriodEnd;
}

/**
 * Update user subscription status using StackAuth UUID
 */
export async function updateUserSubscription(
  stackAuthUserId: string,
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
        eq(userSubscriptions.stackAuthUserId, stackAuthUserId),
        eq(userSubscriptions.subscriptionId, subscriptionId)
      )
    );
}

/**
 * Cancel user's active subscription by creating a Polar customer portal session
 * Following best practices: Polar provides dynamic customer portal sessions
 */
export async function cancelUserSubscription(stackAuthUserId: string, subscriptionId: string) {
  try {
    console.log('🔄 Canceling subscription via Polar API:', subscriptionId);

    // First, get current subscription data from local database for validation
    const currentSubscription = await getUserSubscription(stackAuthUserId);
    if (
      !currentSubscription.activeSubscription ||
      currentSubscription.activeSubscription.subscriptionId !== subscriptionId
    ) {
      throw new Error('Subscription not found or does not belong to this user.');
    }

    if (currentSubscription.status === SubscriptionStatus.CANCELED) {
      throw new Error('Subscription is already canceled.');
    }

    // Cancel subscription via Polar Organization API
    let canceledSubscription;
    try {
      console.log('🔄 Attempting cancellation via subscriptions.revoke');

      // Use the subscriptions.revoke method with the correct object structure
      canceledSubscription = await polar.subscriptions.revoke({
        id: subscriptionId,
      });
    } catch (polarError: unknown) {
      console.error('💥 Polar API error during cancellation:', polarError);

      // Handle specific Polar API errors
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = polarError as any;
      if (error.status === 404) {
        throw new Error('Subscription not found in Polar. It may have already been canceled.');
      } else if (error.status === 403) {
        throw new Error('Access denied. Unable to cancel this subscription.');
      } else if (error.status >= 500) {
        throw new Error(
          'Polar service is temporarily unavailable. Please try again later or contact support.'
        );
      } else {
        throw new Error(
          `Failed to cancel subscription: ${error.message || 'Unknown error occurred'}`
        );
      }
    }

    console.log('✅ Successfully canceled subscription in Polar:', canceledSubscription);

    // Update local database to reflect the cancellation
    await updateUserSubscription(stackAuthUserId, subscriptionId, {
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
      // If it's a known error, pass it through
      throw error;
    }

    // For unknown errors, provide a fallback message
    throw new Error(
      'Unable to cancel subscription at this time. Please contact support at support@yourapp.com or use the subscription management link in your recent Polar emails.'
    );
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
 * Check if a user can create a new subscription
 */
export function canCreateNewSubscription(
  currentSubscription: Awaited<ReturnType<typeof getUserSubscription>>
): { canCreate: boolean; reason?: string } {
  const { activeSubscription, status } = currentSubscription;

  // Always allow if user has no subscription or free tier
  if (!activeSubscription || activeSubscription.tier === 'free') {
    return { canCreate: true };
  }

  // Allow if subscription is canceled (even in grace period)
  if (status === 'canceled') {
    return { canCreate: true };
  }

  // Allow if subscription is in an error state
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') {
    return { canCreate: true };
  }

  // Block if subscription is truly active
  if (status === 'active' && activeSubscription.tier !== 'free') {
    return {
      canCreate: false,
      reason: `You already have an active ${activeSubscription.tier} subscription. Please cancel your current subscription before upgrading to a different plan.`,
    };
  }

  return { canCreate: true };
}

/**
 * Check if a subscription is truly active (not canceled, not in error state)
 */
export function isTrulyActiveSubscription(
  status: SubscriptionStatus | null,
  tier: string
): boolean {
  return status === SubscriptionStatus.ACTIVE && tier !== 'free';
}
