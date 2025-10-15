import { SubscriptionTier, SubscriptionStatus } from '@/lib/db/schema';
import {
  SubscriptionState,
  type SubscriptionEligibility,
  type UserSubscriptionInfo,
} from '@/lib/types';
import { PRICING } from './config';

/**
 * Subscription eligibility and state calculation
 * Contains business logic for determining what actions users can take
 */

/**
 * Calculate the current subscription state based on status, dates, and cancellation flag
 */
export function calculateSubscriptionState(
  status: SubscriptionStatus | null,
  tier: SubscriptionTier,
  currentPeriodEnd: Date | null,
  cancelAtPeriodEnd?: string | null
): SubscriptionState {
  // Free tier is always free
  if (tier === SubscriptionTier.FREE) {
    return SubscriptionState.FREE;
  }

  // Check if subscription is marked for cancellation at period end
  const isMarkedForCancellation = cancelAtPeriodEnd === 'true';

  if (isMarkedForCancellation) {
    // Still in grace period
    if (currentPeriodEnd && new Date() < currentPeriodEnd) {
      return SubscriptionState.CANCELED_GRACE_PERIOD;
    }
    // Grace period expired
    return SubscriptionState.CANCELED_EXPIRED;
  }

  // Handle active subscriptions
  if (status === SubscriptionStatus.ACTIVE) {
    return SubscriptionState.ACTIVE;
  }

  // Handle canceled subscriptions (immediate cancellation)
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
  subscription: UserSubscriptionInfo
): SubscriptionEligibility {
  const { status, tier, currentPeriodEnd, activeSubscription } = subscription;
  const cancelAtPeriodEnd = activeSubscription?.cancelAtPeriodEnd;

  const state = calculateSubscriptionState(status, tier, currentPeriodEnd, cancelAtPeriodEnd);

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
      // During grace period, user can only reactivate - no new subscriptions or upgrades
      // They must either reactivate or wait for the period to end
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
 * Get tier display information
 */
export function getTierInfo(tier: SubscriptionTier) {
  return PRICING[tier];
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
