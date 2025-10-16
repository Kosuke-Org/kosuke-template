import { db } from '@/lib/db';
import { userSubscriptions, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { UserSubscription } from '@/lib/db/schema';
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
 * Create a free tier subscription for a new user
 */
export async function createFreeSubscription(clerkUserId: string): Promise<UserSubscription> {
  // Check if user already has any subscription (prevent duplicates)
  const existingSubscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.clerkUserId, clerkUserId),
  });

  if (existingSubscription) {
    console.log('⚠️ Subscription already exists for user, returning existing:', clerkUserId);
    return existingSubscription;
  }

  // Get stripe customer ID if exists
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });

  const freeSubscriptionData = {
    clerkUserId,
    stripeSubscriptionId: null,
    stripeCustomerId: user?.stripeCustomerId || null,
    stripePriceId: null,
    status: SubscriptionStatus.ACTIVE,
    tier: SubscriptionTier.FREE,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: 'false',
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
