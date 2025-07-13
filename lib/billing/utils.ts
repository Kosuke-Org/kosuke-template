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
function safeSubscriptionTierCast(
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
function safeSubscriptionStatusCast(
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
 * Get user's current subscription information using StackAuth UUID
 */
export async function getUserSubscription(stackAuthUserId: string) {
  const activeSubscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.stackAuthUserId, stackAuthUserId),
    orderBy: [desc(userSubscriptions.createdAt)],
  });

  if (!activeSubscription) {
    return {
      tier: SubscriptionTier.FREE,
      status: null,
      currentPeriodEnd: null,
      activeSubscription: null,
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
 * Cancel user's active subscription
 */
export async function cancelUserSubscription(stackAuthUserId: string, subscriptionId: string) {
  try {
    // Note: For now we're marking as canceled locally.
    // The actual cancellation should be handled through Polar's customer portal
    // or management interface, and the webhook will sync the status.

    // Update local database to mark as canceled
    await db
      .update(userSubscriptions)
      .set({
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userSubscriptions.stackAuthUserId, stackAuthUserId),
          eq(userSubscriptions.subscriptionId, subscriptionId)
        )
      );

    return { success: true };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw new Error('Failed to cancel subscription');
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
