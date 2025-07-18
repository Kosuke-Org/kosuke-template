import { getSubscriptionEligibility, calculateSubscriptionState } from '@/lib/billing/eligibility';
import {
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionState,
  type UserSubscriptionInfo,
} from '@/lib/billing/types';

describe('Subscription Eligibility - Core Business Logic', () => {
  describe('calculateSubscriptionState', () => {
    it('should correctly identify free tier state', () => {
      const state = calculateSubscriptionState(null, SubscriptionTier.FREE, null);
      expect(state).toBe(SubscriptionState.FREE);
    });

    it('should identify active subscriptions', () => {
      const state = calculateSubscriptionState(
        SubscriptionStatus.ACTIVE,
        SubscriptionTier.PRO,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );
      expect(state).toBe(SubscriptionState.ACTIVE);
    });

    it('should detect grace period for cancelled subscriptions', () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
      const state = calculateSubscriptionState(
        SubscriptionStatus.CANCELED,
        SubscriptionTier.PRO,
        futureDate
      );
      expect(state).toBe(SubscriptionState.CANCELED_GRACE_PERIOD);
    });

    it('should identify expired cancelled subscriptions', () => {
      const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      const state = calculateSubscriptionState(
        SubscriptionStatus.CANCELED,
        SubscriptionTier.PRO,
        pastDate
      );
      expect(state).toBe(SubscriptionState.CANCELED_EXPIRED);
    });

    it('should handle past due subscriptions', () => {
      const state = calculateSubscriptionState(
        SubscriptionStatus.PAST_DUE,
        SubscriptionTier.BUSINESS,
        new Date()
      );
      expect(state).toBe(SubscriptionState.PAST_DUE);
    });
  });

  describe('getSubscriptionEligibility', () => {
    it('should allow free users to create new subscriptions', () => {
      const subscription: UserSubscriptionInfo = {
        tier: SubscriptionTier.FREE,
        status: null,
        activeSubscription: null,
        currentPeriodEnd: null,
      };

      const eligibility = getSubscriptionEligibility(subscription);

      expect(eligibility.canCreateNew).toBe(true);
      expect(eligibility.canUpgrade).toBe(true); // Free users can upgrade
      expect(eligibility.canCancel).toBe(false);
      expect(eligibility.canReactivate).toBe(false);
      expect(eligibility.state).toBe(SubscriptionState.FREE);
    });

    it('should allow pro users to upgrade to business', () => {
      const subscription: UserSubscriptionInfo = {
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        activeSubscription: { subscriptionId: 'sub_123' },
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const eligibility = getSubscriptionEligibility(subscription);

      expect(eligibility.canCreateNew).toBe(false);
      expect(eligibility.canUpgrade).toBe(true);
      expect(eligibility.canCancel).toBe(true);
      expect(eligibility.canReactivate).toBe(false);
      expect(eligibility.state).toBe(SubscriptionState.ACTIVE);
    });

    it('should allow business users to manage their subscription', () => {
      const subscription: UserSubscriptionInfo = {
        tier: SubscriptionTier.BUSINESS,
        status: SubscriptionStatus.ACTIVE,
        activeSubscription: { subscriptionId: 'sub_123' },
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const eligibility = getSubscriptionEligibility(subscription);

      expect(eligibility.canCreateNew).toBe(false);
      expect(eligibility.canUpgrade).toBe(true); // Active users can change tiers
      expect(eligibility.canCancel).toBe(true);
      expect(eligibility.canReactivate).toBe(false);
      expect(eligibility.state).toBe(SubscriptionState.ACTIVE);
    });

    it('should allow reactivation during grace period', () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days from now
      const subscription: UserSubscriptionInfo = {
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.CANCELED,
        activeSubscription: null,
        currentPeriodEnd: futureDate,
      };

      const eligibility = getSubscriptionEligibility(subscription);

      expect(eligibility.canCreateNew).toBe(true); // Can create new for tier changes
      expect(eligibility.canUpgrade).toBe(false);
      expect(eligibility.canCancel).toBe(false);
      expect(eligibility.canReactivate).toBe(true);
      expect(eligibility.state).toBe(SubscriptionState.CANCELED_GRACE_PERIOD);
      expect(eligibility.gracePeriodEnds).toEqual(futureDate);
    });

    it('should allow new subscription after cancellation expires', () => {
      const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const subscription: UserSubscriptionInfo = {
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.CANCELED,
        activeSubscription: null,
        currentPeriodEnd: pastDate,
      };

      const eligibility = getSubscriptionEligibility(subscription);

      expect(eligibility.canCreateNew).toBe(true);
      expect(eligibility.canUpgrade).toBe(true); // Expired users can upgrade
      expect(eligibility.canCancel).toBe(false);
      expect(eligibility.canReactivate).toBe(false);
      expect(eligibility.state).toBe(SubscriptionState.CANCELED_EXPIRED);
    });

    it('should handle past due subscriptions appropriately', () => {
      const subscription: UserSubscriptionInfo = {
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.PAST_DUE,
        activeSubscription: { subscriptionId: 'sub_123' },
        currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const eligibility = getSubscriptionEligibility(subscription);

      expect(eligibility.canCreateNew).toBe(true); // Past due can create new
      expect(eligibility.canUpgrade).toBe(true); // Past due can upgrade
      expect(eligibility.canCancel).toBe(false);
      expect(eligibility.canReactivate).toBe(false);
      expect(eligibility.state).toBe(SubscriptionState.PAST_DUE);
    });
  });
});
