import { desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { orgSubscriptions } from '@/lib/db/schema';
import { SubscriptionStatus, SubscriptionTier, type SubscriptionTierType } from '@/lib/db/schema';
import type { OrgSubscriptionInfo } from '@/lib/types';

import { getAllLookupKeys } from './products';
import productsConfig from './products.json';

/**
 * Core subscription CRUD operations
 * Handles database interactions for user subscriptions
 *
 * Note: tier values are now lookup keys (e.g., 'free_monthly', 'pro_monthly')
 */

/**
 * Type guard to validate SubscriptionTier values (lookup keys)
 */
function isValidSubscriptionTier(value: string): value is SubscriptionTierType {
  const validLookupKeys = getAllLookupKeys();
  return validLookupKeys.includes(value);
}

/**
 * Type guard to validate SubscriptionStatus enum values
 */
function isValidSubscriptionStatus(value: string): value is SubscriptionStatus {
  return Object.values(SubscriptionStatus).includes(value as SubscriptionStatus);
}

/**
 * Safely cast a string to SubscriptionTier (lookup key) with fallback
 */
export function safeSubscriptionTierCast(value: string) {
  if (isValidSubscriptionTier(value)) {
    return value;
  }
  console.warn(
    `Invalid subscription tier value: ${value}. Falling back to ${SubscriptionTier.FREE_MONTHLY}`
  );
  return SubscriptionTier.FREE_MONTHLY;
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
 * Get organization's current subscription information using Organization ID
 * Returns free tier if no paid subscription exists (no record created)
 */
export async function getOrgSubscription(organizationId: string): Promise<OrgSubscriptionInfo> {
  const activeSubscription = await db.query.orgSubscriptions.findFirst({
    where: eq(orgSubscriptions.organizationId, organizationId),
    orderBy: [desc(orgSubscriptions.createdAt)],
  });

  // If no subscription exists, return free tier (no record created)
  if (!activeSubscription) {
    console.log('📋 No subscription found, returning free tier for org:', organizationId);
    return {
      tier: SubscriptionTier.FREE_MONTHLY,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: null,
      activeSubscription: null,
    };
  }

  // Safely cast the subscription tier with validation
  const subscriptionTier = safeSubscriptionTierCast(activeSubscription.tier);
  const subscriptionStatus = safeSubscriptionStatusCast(activeSubscription.status);

  // Check if subscription is marked for cancellation at period end
  const isCancelAtPeriodEnd = activeSubscription.cancelAtPeriodEnd === 'true';

  // User has access to paid tier if:
  // 1. Subscription is active and not marked for cancellation
  // 2. Subscription is marked for cancellation but still in grace period
  const isInGracePeriod =
    isCancelAtPeriodEnd &&
    activeSubscription.currentPeriodEnd &&
    new Date() < activeSubscription.currentPeriodEnd;

  let currentTier = null;

  if (
    (subscriptionStatus === SubscriptionStatus.ACTIVE && !isCancelAtPeriodEnd) ||
    isInGracePeriod
  ) {
    currentTier = subscriptionTier;
  } else {
    currentTier = SubscriptionTier.FREE_MONTHLY;
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
 *
 * Uses explicit tierLevel from products.json with array order as fallback:
 * 1. First tries to use the explicit 'tierLevel' field from products.json
 * 2. Falls back to array index if tierLevel is missing
 *
 * This approach provides:
 * - Explicit, self-documenting hierarchy (tierLevel field)
 * - Flexibility to reorder products without breaking access
 * - Backward compatibility (falls back to array order)
 * - Easy to add yearly variants at same tier level
 */
export function hasFeatureAccess(userLookupKey: string, requiredLookupKey: string): boolean {
  const userProduct = productsConfig.products.find((p) => p.lookupKey === userLookupKey);
  const requiredProduct = productsConfig.products.find((p) => p.lookupKey === requiredLookupKey);

  // Get tier level, using explicit tierLevel if available, otherwise fall back to array index
  const getUserLevel = (product: typeof userProduct, lookupKey: string): number => {
    if (!product) return 0; // Not found = lowest tier

    // Prefer explicit tierLevel if defined
    if (typeof product.tierLevel === 'number') {
      return product.tierLevel;
    }

    // Fallback to array index
    const index = productsConfig.products.findIndex((p) => p.lookupKey === lookupKey);
    return index >= 0 ? index : 0;
  };

  const userLevel = getUserLevel(userProduct, userLookupKey);
  const requiredLevel = getUserLevel(requiredProduct, requiredLookupKey);

  return userLevel >= requiredLevel;
}
