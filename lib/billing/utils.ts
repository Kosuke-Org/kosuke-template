import { Polar } from '@polar-sh/sdk';
import { db } from '@/lib/db';
import { users, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SubscriptionTier, SubscriptionStatus } from '@/lib/db/schema';

// Initialize Polar client
const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
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
 * Get user's current subscription information
 */
export async function getUserSubscription(userId: string) {
  const userRecord = await db.query.users.findFirst({
    where: eq(users.id, parseInt(userId)),
    with: {
      subscriptions: {
        where: eq(subscriptions.status, 'active'),
        orderBy: (subscriptions, { desc }) => [desc(subscriptions.createdAt)],
        limit: 1,
      },
    },
  });

  if (!userRecord) {
    return null;
  }

  return {
    tier: userRecord.subscriptionTier as SubscriptionTier,
    status: userRecord.subscriptionStatus as SubscriptionStatus,
    currentPeriodEnd: userRecord.currentPeriodEnd,
    activeSubscription: userRecord.subscriptions[0] || null,
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
 * Update user subscription status
 */
export async function updateUserSubscription(
  userId: string,
  updates: {
    subscriptionTier?: SubscriptionTier;
    subscriptionStatus?: SubscriptionStatus;
    subscriptionId?: string;
    currentPeriodEnd?: Date;
  }
) {
  await db
    .update(users)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(users.id, parseInt(userId)));
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
