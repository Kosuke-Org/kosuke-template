import { db } from '@/lib/db';
import { userSubscriptions } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { UserSubscription } from '@/lib/db/schema';
import { SubscriptionTier, SubscriptionStatus } from '@/lib/db/schema';
import { type UserSubscriptionInfo, type SubscriptionUpdateParams } from '@/lib/types';

/**
 * Core subscription CRUD operations
 * Handles database interactions for user subscriptions
 */

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
 * Create a free tier subscription for a new user
 */
export async function createFreeSubscription(clerkUserId: string): Promise<UserSubscription> {
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
export async function getUserSubscription(clerkUserId: string): Promise<UserSubscriptionInfo> {
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

  // Determine current tier based on subscription state
  let currentTier = SubscriptionTier.FREE;

  // User has access to paid tier if:
  // 1. Subscription is active
  // 2. Subscription is canceled but still in grace period
  const isInGracePeriod =
    subscriptionStatus === SubscriptionStatus.CANCELED &&
    activeSubscription.currentPeriodEnd &&
    new Date() < activeSubscription.currentPeriodEnd;

  if (subscriptionStatus === SubscriptionStatus.ACTIVE || isInGracePeriod) {
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
 * Update user subscription status using Clerk user ID
 */
export async function updateUserSubscription(
  clerkUserId: string,
  subscriptionId: string,
  updates: SubscriptionUpdateParams
): Promise<void> {
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
