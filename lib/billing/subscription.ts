import { db } from '@/lib/db';
import { userSubscriptions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { SubscriptionTier, SubscriptionStatus } from '@/lib/db/schema';
import { type UserSubscriptionInfo } from '@/lib/types';

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
 * Get user's current subscription information using Clerk user ID
 * Returns free tier if no paid subscription exists (no record created)
 */
export async function getUserSubscription(userId: string): Promise<UserSubscriptionInfo> {
  const activeSubscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, userId),
    orderBy: [desc(userSubscriptions.createdAt)],
  });

  // If no subscription exists, return free tier (no record created)
  if (!activeSubscription) {
    console.log('📋 No subscription found, returning free tier for user:', userId);
    return {
      tier: SubscriptionTier.FREE,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: null,
      activeSubscription: null,
    };
  }

  // Safely cast the subscription tier with validation
  const subscriptionTier = safeSubscriptionTierCast(activeSubscription.tier);
  const subscriptionStatus = safeSubscriptionStatusCast(activeSubscription.status);

  // Determine current tier based on subscription state
  let currentTier = SubscriptionTier.FREE;

  // Check if subscription is marked for cancellation at period end
  const isCancelAtPeriodEnd = activeSubscription.cancelAtPeriodEnd === 'true';

  // User has access to paid tier if:
  // 1. Subscription is active and not marked for cancellation
  // 2. Subscription is marked for cancellation but still in grace period
  const isInGracePeriod =
    isCancelAtPeriodEnd &&
    activeSubscription.currentPeriodEnd &&
    new Date() < activeSubscription.currentPeriodEnd;

  if (
    (subscriptionStatus === SubscriptionStatus.ACTIVE && !isCancelAtPeriodEnd) ||
    isInGracePeriod
  ) {
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
