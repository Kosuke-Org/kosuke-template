import { calculateSubscriptionState, getSubscriptionEligibility } from '@/lib/billing';
import { SubscriptionStatus, SubscriptionTier, type SubscriptionTierType } from '@/lib/db/schema';
import { SubscriptionState, type UserSubscriptionInfo } from '@/lib/types';

describe('Subscription Eligibility Business Logic', () => {
  describe('calculateSubscriptionState', () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    it('should return FREE for free tier regardless of status', () => {
      expect(
        calculateSubscriptionState(SubscriptionStatus.ACTIVE, SubscriptionTier.FREE_MONTHLY, null)
      ).toBe(SubscriptionState.FREE);

      expect(
        calculateSubscriptionState(
          SubscriptionStatus.CANCELED,
          SubscriptionTier.FREE_MONTHLY,
          futureDate
        )
      ).toBe(SubscriptionState.FREE);
    });

    it('should return ACTIVE for active paid subscriptions', () => {
      expect(
        calculateSubscriptionState(
          SubscriptionStatus.ACTIVE,
          SubscriptionTier.PRO_MONTHLY,
          futureDate
        )
      ).toBe(SubscriptionState.ACTIVE);

      expect(
        calculateSubscriptionState(
          SubscriptionStatus.ACTIVE,
          SubscriptionTier.BUSINESS_MONTHLY,
          null
        )
      ).toBe(SubscriptionState.ACTIVE);
    });

    it('should return CANCELED_GRACE_PERIOD for canceled subscription within grace period', () => {
      expect(
        calculateSubscriptionState(
          SubscriptionStatus.CANCELED,
          SubscriptionTier.PRO_MONTHLY,
          futureDate
        )
      ).toBe(SubscriptionState.CANCELED_GRACE_PERIOD);
    });

    it('should return CANCELED_EXPIRED for canceled subscription past grace period', () => {
      expect(
        calculateSubscriptionState(
          SubscriptionStatus.CANCELED,
          SubscriptionTier.PRO_MONTHLY,
          pastDate
        )
      ).toBe(SubscriptionState.CANCELED_EXPIRED);

      expect(
        calculateSubscriptionState(SubscriptionStatus.CANCELED, SubscriptionTier.PRO_MONTHLY, null)
      ).toBe(SubscriptionState.CANCELED_EXPIRED);
    });

    it('should handle all subscription statuses correctly', () => {
      expect(
        calculateSubscriptionState(SubscriptionStatus.PAST_DUE, SubscriptionTier.PRO_MONTHLY, null)
      ).toBe(SubscriptionState.PAST_DUE);

      expect(
        calculateSubscriptionState(
          SubscriptionStatus.INCOMPLETE,
          SubscriptionTier.PRO_MONTHLY,
          null
        )
      ).toBe(SubscriptionState.INCOMPLETE);

      expect(
        calculateSubscriptionState(SubscriptionStatus.UNPAID, SubscriptionTier.PRO_MONTHLY, null)
      ).toBe(SubscriptionState.UNPAID);
    });

    it('should default to FREE for unknown status', () => {
      expect(calculateSubscriptionState(null, SubscriptionTier.PRO_MONTHLY, null)).toBe(
        SubscriptionState.FREE
      );
    });
  });

  describe('getSubscriptionEligibility', () => {
    const createUserSubscription = (
      tier: SubscriptionTierType,
      status: SubscriptionStatus | null,
      currentPeriodEnd: Date | null = null
    ): UserSubscriptionInfo => ({
      tier,
      status,
      currentPeriodEnd,
      activeSubscription: null,
    });

    describe('FREE tier eligibility', () => {
      it('should allow creating new subscriptions and upgrades', () => {
        const subscription = createUserSubscription(SubscriptionTier.FREE_MONTHLY, null);
        const eligibility = getSubscriptionEligibility(subscription);

        expect(eligibility.state).toBe(SubscriptionState.FREE);
        expect(eligibility.canCreateNew).toBe(true);
        expect(eligibility.canUpgrade).toBe(true);
        expect(eligibility.canCancel).toBe(false);
        expect(eligibility.canReactivate).toBe(false);
      });
    });

    describe('ACTIVE subscription eligibility', () => {
      it('should allow cancellation and upgrades', () => {
        const subscription = createUserSubscription(
          SubscriptionTier.PRO_MONTHLY,
          SubscriptionStatus.ACTIVE
        );
        const eligibility = getSubscriptionEligibility(subscription);

        expect(eligibility.state).toBe(SubscriptionState.ACTIVE);
        expect(eligibility.canCancel).toBe(true);
        expect(eligibility.canUpgrade).toBe(true);
        expect(eligibility.canCreateNew).toBe(false);
        expect(eligibility.canReactivate).toBe(false);
      });
    });

    describe('CANCELED_GRACE_PERIOD eligibility', () => {
      it('should allow reactivation only (must reactivate or wait for expiry)', () => {
        const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
        const subscription = createUserSubscription(
          SubscriptionTier.PRO_MONTHLY,
          SubscriptionStatus.CANCELED,
          futureDate
        );
        const eligibility = getSubscriptionEligibility(subscription);

        expect(eligibility.state).toBe(SubscriptionState.CANCELED_GRACE_PERIOD);
        expect(eligibility.canReactivate).toBe(true);
        expect(eligibility.canCreateNew).toBe(false); // Must reactivate existing subscription
        expect(eligibility.canCancel).toBe(false);
        expect(eligibility.canUpgrade).toBe(false);
        expect(eligibility.gracePeriodEnds).toEqual(futureDate);
      });
    });

    describe('CANCELED_EXPIRED eligibility', () => {
      it('should allow creating new subscriptions and upgrades', () => {
        const pastDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
        const subscription = createUserSubscription(
          SubscriptionTier.PRO_MONTHLY,
          SubscriptionStatus.CANCELED,
          pastDate
        );
        const eligibility = getSubscriptionEligibility(subscription);

        expect(eligibility.state).toBe(SubscriptionState.CANCELED_EXPIRED);
        expect(eligibility.canCreateNew).toBe(true);
        expect(eligibility.canUpgrade).toBe(true);
        expect(eligibility.canReactivate).toBe(false);
        expect(eligibility.canCancel).toBe(false);
      });
    });

    describe('problematic subscription states', () => {
      it('should allow new subscriptions for PAST_DUE', () => {
        const subscription = createUserSubscription(
          SubscriptionTier.PRO_MONTHLY,
          SubscriptionStatus.PAST_DUE
        );
        const eligibility = getSubscriptionEligibility(subscription);

        expect(eligibility.state).toBe(SubscriptionState.PAST_DUE);
        expect(eligibility.canCreateNew).toBe(true);
        expect(eligibility.canUpgrade).toBe(true);
        expect(eligibility.canReactivate).toBe(false);
        expect(eligibility.canCancel).toBe(false);
      });

      it('should allow new subscriptions for INCOMPLETE', () => {
        const subscription = createUserSubscription(
          SubscriptionTier.PRO_MONTHLY,
          SubscriptionStatus.INCOMPLETE
        );
        const eligibility = getSubscriptionEligibility(subscription);

        expect(eligibility.state).toBe(SubscriptionState.INCOMPLETE);
        expect(eligibility.canCreateNew).toBe(true);
        expect(eligibility.canUpgrade).toBe(true);
      });

      it('should allow new subscriptions for UNPAID', () => {
        const subscription = createUserSubscription(
          SubscriptionTier.PRO_MONTHLY,
          SubscriptionStatus.UNPAID
        );
        const eligibility = getSubscriptionEligibility(subscription);

        expect(eligibility.state).toBe(SubscriptionState.UNPAID);
        expect(eligibility.canCreateNew).toBe(true);
        expect(eligibility.canUpgrade).toBe(true);
      });
    });
  });
});
