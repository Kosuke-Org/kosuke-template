import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCaller } from '@/lib/trpc/server';
import { createMockTRPCContext } from '@/__tests__/setup/mocks';
import type { UserSubscriptionInfo, SubscriptionEligibility } from '@/lib/types';
import { SubscriptionTier, SubscriptionStatus } from '@/lib/db/schema';
import { SubscriptionState } from '@/lib/types';
import type Stripe from 'stripe';

vi.mock('@/lib/billing', () => ({
  getUserSubscription: vi.fn(),
  getSubscriptionEligibility: vi.fn(),
  createCheckoutSession: vi.fn(),
  cancelUserSubscription: vi.fn(),
  reactivateUserSubscription: vi.fn(),
  createCustomerPortalSession: vi.fn(),
  cancelPendingDowngrade: vi.fn(),
}));

vi.mock('@/lib/billing/stripe-sync', () => ({
  syncUserSubscriptionFromStripe: vi.fn(),
  syncStaleSubscriptions: vi.fn(),
}));

describe('Billing Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStatus', () => {
    it('should return subscription status', async () => {
      const { getUserSubscription } = await import('@/lib/billing');
      const mockSubscriptionInfo: UserSubscriptionInfo = {
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date(),
        activeSubscription: null,
      };
      vi.mocked(getUserSubscription).mockResolvedValue(mockSubscriptionInfo);

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      const result = await caller.billing.getStatus();

      expect(result.tier).toBe(SubscriptionTier.PRO);
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(result.currentPeriodEnd).toBeInstanceOf(Date);
      expect(result.activeSubscription).toBeNull();
    });

    it('should throw error when not authenticated', async () => {
      const caller = await createCaller(createMockTRPCContext());

      await expect(caller.billing.getStatus()).rejects.toThrow('You must be logged in');
    });
  });

  describe('canSubscribe', () => {
    it('should return eligibility for free user', async () => {
      const { getUserSubscription, getSubscriptionEligibility } = await import('@/lib/billing');

      const mockSubscriptionInfo: UserSubscriptionInfo = {
        tier: SubscriptionTier.FREE,
        status: null,
        currentPeriodEnd: null,
        activeSubscription: null,
      };

      const mockEligibility: SubscriptionEligibility = {
        canCreateNew: true,
        canUpgrade: true,
        canReactivate: false,
        canCancel: false,
        state: SubscriptionState.FREE,
      };

      vi.mocked(getUserSubscription).mockResolvedValue(mockSubscriptionInfo);
      vi.mocked(getSubscriptionEligibility).mockReturnValue(mockEligibility);

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      const result = await caller.billing.canSubscribe();

      expect(result.canSubscribe).toBe(true);
      expect(result.canCreateNew).toBe(true);
      expect(result.canUpgrade).toBe(true);
      expect(result.canReactivate).toBe(false);
      expect(result.canCancel).toBe(false);
      expect(result.currentSubscription.tier).toBe(SubscriptionTier.FREE);
    });

    it('should return eligibility for active pro user', async () => {
      const { getUserSubscription, getSubscriptionEligibility } = await import('@/lib/billing');

      const mockSubscriptionInfo: UserSubscriptionInfo = {
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        activeSubscription: null,
      };

      const mockEligibility: SubscriptionEligibility = {
        canCreateNew: false,
        canUpgrade: true,
        canReactivate: false,
        canCancel: true,
        state: SubscriptionState.ACTIVE,
      };

      vi.mocked(getUserSubscription).mockResolvedValue(mockSubscriptionInfo);
      vi.mocked(getSubscriptionEligibility).mockReturnValue(mockEligibility);

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      const result = await caller.billing.canSubscribe();

      expect(result.canSubscribe).toBe(true); // Can upgrade
      expect(result.canCreateNew).toBe(false);
      expect(result.canUpgrade).toBe(true);
      expect(result.canCancel).toBe(true);
    });

    it('should calculate grace period correctly', async () => {
      const { getUserSubscription, getSubscriptionEligibility } = await import('@/lib/billing');

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const mockSubscriptionInfo: UserSubscriptionInfo = {
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.CANCELED,
        currentPeriodEnd: futureDate,
        activeSubscription: null,
      };

      const mockEligibility: SubscriptionEligibility = {
        canCreateNew: false,
        canUpgrade: false,
        canReactivate: true,
        canCancel: false,
        state: SubscriptionState.CANCELED_GRACE_PERIOD,
      };

      vi.mocked(getUserSubscription).mockResolvedValue(mockSubscriptionInfo);
      vi.mocked(getSubscriptionEligibility).mockReturnValue(mockEligibility);

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      const result = await caller.billing.canSubscribe();

      expect(result.currentSubscription.isInGracePeriod).toBe(true);
      expect(result.canReactivate).toBe(true);
    });
  });

  describe('createCheckout', () => {
    it('should create checkout session for free user', async () => {
      const { getUserSubscription, getSubscriptionEligibility, createCheckoutSession } =
        await import('@/lib/billing');

      const mockSubscriptionInfo: UserSubscriptionInfo = {
        tier: SubscriptionTier.FREE,
        status: null,
        currentPeriodEnd: null,
        activeSubscription: null,
      };

      const mockEligibility: SubscriptionEligibility = {
        canCreateNew: true,
        canUpgrade: true,
        canReactivate: false,
        canCancel: false,
        state: SubscriptionState.FREE,
      };

      vi.mocked(getUserSubscription).mockResolvedValue(mockSubscriptionInfo);
      vi.mocked(getSubscriptionEligibility).mockReturnValue(mockEligibility);
      vi.mocked(createCheckoutSession).mockResolvedValue({
        success: true,
        message: 'Checkout session created',
        data: {
          url: 'https://checkout.stripe.com/test',
          id: 'cs_test_123',
        },
      });

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      const result = await caller.billing.createCheckout({ tier: 'pro' });

      expect(result.checkoutUrl).toContain('stripe.com');
      expect(result.sessionId).toBe('cs_test_123');
      expect(createCheckoutSession).toHaveBeenCalledWith({
        tier: 'pro',
        userId: 'user_123',
        customerEmail: 'test@example.com',
      });
    });

    it('should throw error when user cannot subscribe', async () => {
      const { getUserSubscription, getSubscriptionEligibility } = await import('@/lib/billing');

      const mockSubscriptionInfo: UserSubscriptionInfo = {
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.PAST_DUE,
        currentPeriodEnd: new Date(),
        activeSubscription: null,
      };

      const mockEligibility: SubscriptionEligibility = {
        canCreateNew: false,
        canUpgrade: false,
        canReactivate: false,
        canCancel: false,
        state: SubscriptionState.PAST_DUE,
        reason: 'Payment past due',
      };

      vi.mocked(getUserSubscription).mockResolvedValue(mockSubscriptionInfo);
      vi.mocked(getSubscriptionEligibility).mockReturnValue(mockEligibility);

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      await expect(caller.billing.createCheckout({ tier: 'pro' })).rejects.toThrow(
        'Payment past due'
      );
    });

    it('should throw error when checkout session creation fails', async () => {
      const { getUserSubscription, getSubscriptionEligibility, createCheckoutSession } =
        await import('@/lib/billing');

      const mockSubscriptionInfo: UserSubscriptionInfo = {
        tier: SubscriptionTier.FREE,
        status: null,
        currentPeriodEnd: null,
        activeSubscription: null,
      };

      const mockEligibility: SubscriptionEligibility = {
        canCreateNew: true,
        canUpgrade: true,
        canReactivate: false,
        canCancel: false,
        state: SubscriptionState.FREE,
      };

      vi.mocked(getUserSubscription).mockResolvedValue(mockSubscriptionInfo);
      vi.mocked(getSubscriptionEligibility).mockReturnValue(mockEligibility);
      vi.mocked(createCheckoutSession).mockResolvedValue({
        success: false,
        message: 'Stripe API error',
      });

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      await expect(caller.billing.createCheckout({ tier: 'pro' })).rejects.toThrow(
        'Stripe API error'
      );
    });
  });

  describe('cancel', () => {
    it('should cancel active subscription', async () => {
      const { getUserSubscription, getSubscriptionEligibility, cancelUserSubscription } =
        await import('@/lib/billing');

      const mockSubscriptionInfo: UserSubscriptionInfo = {
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        activeSubscription: {
          id: 'sub_123',
          stripeSubscriptionId: 'sub_stripe_123',
          userId: 'user_123',
          organizationId: null,
          subscriptionType: 'personal' as const,
          stripeCustomerId: 'cus_123',
          stripePriceId: 'price_123',
          status: 'active',
          tier: 'pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          cancelAtPeriodEnd: 'false',
          scheduledDowngradeTier: null,
          canceledAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const mockEligibility: SubscriptionEligibility = {
        canCreateNew: false,
        canUpgrade: false,
        canReactivate: false,
        canCancel: true,
        state: SubscriptionState.ACTIVE,
      };

      vi.mocked(getUserSubscription).mockResolvedValue(mockSubscriptionInfo);
      vi.mocked(getSubscriptionEligibility).mockReturnValue(mockEligibility);
      vi.mocked(cancelUserSubscription).mockResolvedValue({
        success: true,
        message: 'Subscription will be canceled at period end',
      });

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      const result = await caller.billing.cancel();

      expect(result.success).toBe(true);
      expect(result.message).toContain('canceled');
      expect(cancelUserSubscription).toHaveBeenCalledWith('user_123', 'sub_stripe_123');
    });

    it('should throw error when no active subscription', async () => {
      const { getUserSubscription, getSubscriptionEligibility } = await import('@/lib/billing');

      const mockSubscriptionInfo: UserSubscriptionInfo = {
        tier: SubscriptionTier.FREE,
        status: null,
        currentPeriodEnd: null,
        activeSubscription: null,
      };

      const mockEligibility: SubscriptionEligibility = {
        canCreateNew: true,
        canUpgrade: true,
        canReactivate: false,
        canCancel: false,
        state: SubscriptionState.FREE,
      };

      vi.mocked(getUserSubscription).mockResolvedValue(mockSubscriptionInfo);
      vi.mocked(getSubscriptionEligibility).mockReturnValue(mockEligibility);

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      await expect(caller.billing.cancel()).rejects.toThrow('Subscription cannot be canceled');
    });

    it('should throw error when cancellation not allowed', async () => {
      const { getUserSubscription, getSubscriptionEligibility } = await import('@/lib/billing');

      const mockSubscriptionInfo: UserSubscriptionInfo = {
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.PAST_DUE,
        currentPeriodEnd: new Date(),
        activeSubscription: {
          id: 'sub_123',
          stripeSubscriptionId: 'sub_stripe_123',
          userId: 'user_123',
          organizationId: null,
          subscriptionType: 'personal' as const,
          stripeCustomerId: 'cus_123',
          stripePriceId: 'price_123',
          status: 'past_due',
          tier: 'pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: 'false',
          scheduledDowngradeTier: null,
          canceledAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const mockEligibility: SubscriptionEligibility = {
        canCreateNew: false,
        canUpgrade: false,
        canReactivate: false,
        canCancel: false,
        state: SubscriptionState.PAST_DUE,
        reason: 'Payment past due',
      };

      vi.mocked(getUserSubscription).mockResolvedValue(mockSubscriptionInfo);
      vi.mocked(getSubscriptionEligibility).mockReturnValue(mockEligibility);

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      await expect(caller.billing.cancel()).rejects.toThrow('Subscription cannot be canceled');
    });

    it('should throw error when cancellation operation fails', async () => {
      const { getUserSubscription, getSubscriptionEligibility, cancelUserSubscription } =
        await import('@/lib/billing');

      const mockSubscriptionInfo: UserSubscriptionInfo = {
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date(),
        activeSubscription: {
          id: 'sub_123',
          stripeSubscriptionId: 'sub_stripe_123',
          userId: 'user_123',
          organizationId: null,
          subscriptionType: 'personal' as const,
          stripeCustomerId: 'cus_123',
          stripePriceId: 'price_123',
          status: 'active',
          tier: 'pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: 'false',
          scheduledDowngradeTier: null,
          canceledAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const mockEligibility: SubscriptionEligibility = {
        canCreateNew: false,
        canUpgrade: false,
        canReactivate: false,
        canCancel: true,
        state: SubscriptionState.ACTIVE,
      };

      vi.mocked(getUserSubscription).mockResolvedValue(mockSubscriptionInfo);
      vi.mocked(getSubscriptionEligibility).mockReturnValue(mockEligibility);
      vi.mocked(cancelUserSubscription).mockResolvedValue({
        success: false,
        message: 'Stripe API error',
      });

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      await expect(caller.billing.cancel()).rejects.toThrow('Stripe API error');
    });
  });

  describe('reactivate', () => {
    it('should reactivate canceled subscription in grace period', async () => {
      const { getUserSubscription, getSubscriptionEligibility, reactivateUserSubscription } =
        await import('@/lib/billing');

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const mockSubscriptionInfo: UserSubscriptionInfo = {
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.CANCELED,
        currentPeriodEnd: futureDate,
        activeSubscription: {
          id: 'sub_123',
          stripeSubscriptionId: 'sub_stripe_123',
          userId: 'user_123',
          organizationId: null,
          subscriptionType: 'personal' as const,
          stripeCustomerId: 'cus_123',
          stripePriceId: 'price_123',
          status: 'canceled',
          tier: 'pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: futureDate,
          cancelAtPeriodEnd: 'true',
          scheduledDowngradeTier: null,
          canceledAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const mockEligibility: SubscriptionEligibility = {
        canCreateNew: false,
        canUpgrade: false,
        canReactivate: true,
        canCancel: false,
        state: SubscriptionState.CANCELED_GRACE_PERIOD,
        gracePeriodEnds: futureDate,
      };

      vi.mocked(getUserSubscription).mockResolvedValue(mockSubscriptionInfo);
      vi.mocked(getSubscriptionEligibility).mockReturnValue(mockEligibility);
      vi.mocked(reactivateUserSubscription).mockResolvedValue({
        success: true,
        message: 'Subscription reactivated successfully',
      });

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      const result = await caller.billing.reactivate();

      expect(result.success).toBe(true);
      expect(result.message).toContain('reactivated');
      expect(result.subscription.id).toBe('sub_stripe_123');
      expect(result.subscription.tier).toBe('pro');
      expect(result.subscription.status).toBe('active');
      expect(reactivateUserSubscription).toHaveBeenCalledWith('user_123', 'sub_stripe_123');
    });

    it('should throw error when cannot reactivate', async () => {
      const { getUserSubscription, getSubscriptionEligibility } = await import('@/lib/billing');

      const mockSubscriptionInfo: UserSubscriptionInfo = {
        tier: SubscriptionTier.FREE,
        status: null,
        currentPeriodEnd: null,
        activeSubscription: null,
      };

      const mockEligibility: SubscriptionEligibility = {
        canCreateNew: true,
        canUpgrade: true,
        canReactivate: false,
        canCancel: false,
        state: SubscriptionState.FREE,
      };

      vi.mocked(getUserSubscription).mockResolvedValue(mockSubscriptionInfo);
      vi.mocked(getSubscriptionEligibility).mockReturnValue(mockEligibility);

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      await expect(caller.billing.reactivate()).rejects.toThrow(
        'Subscription cannot be reactivated'
      );
    });

    it('should throw error when no subscription to reactivate', async () => {
      const { getUserSubscription, getSubscriptionEligibility } = await import('@/lib/billing');

      const mockSubscriptionInfo: UserSubscriptionInfo = {
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.CANCELED,
        currentPeriodEnd: new Date(),
        activeSubscription: null,
      };

      const mockEligibility: SubscriptionEligibility = {
        canCreateNew: false,
        canUpgrade: false,
        canReactivate: true,
        canCancel: false,
        state: SubscriptionState.CANCELED_GRACE_PERIOD,
      };

      vi.mocked(getUserSubscription).mockResolvedValue(mockSubscriptionInfo);
      vi.mocked(getSubscriptionEligibility).mockReturnValue(mockEligibility);

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      await expect(caller.billing.reactivate()).rejects.toThrow('No subscription found');
    });

    it('should throw error when reactivation operation fails', async () => {
      const { getUserSubscription, getSubscriptionEligibility, reactivateUserSubscription } =
        await import('@/lib/billing');

      const mockSubscriptionInfo: UserSubscriptionInfo = {
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.CANCELED,
        currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        activeSubscription: {
          id: 'sub_123',
          stripeSubscriptionId: 'sub_stripe_123',
          userId: 'user_123',
          organizationId: null,
          subscriptionType: 'personal' as const,
          stripeCustomerId: 'cus_123',
          stripePriceId: 'price_123',
          status: 'canceled',
          tier: 'pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          cancelAtPeriodEnd: 'true',
          scheduledDowngradeTier: null,
          canceledAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const mockEligibility: SubscriptionEligibility = {
        canCreateNew: false,
        canUpgrade: false,
        canReactivate: true,
        canCancel: false,
        state: SubscriptionState.CANCELED_GRACE_PERIOD,
      };

      vi.mocked(getUserSubscription).mockResolvedValue(mockSubscriptionInfo);
      vi.mocked(getSubscriptionEligibility).mockReturnValue(mockEligibility);
      vi.mocked(reactivateUserSubscription).mockResolvedValue({
        success: false,
        message: 'Stripe API error',
      });

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      await expect(caller.billing.reactivate()).rejects.toThrow('Stripe API error');
    });
  });

  describe('createPortalSession', () => {
    it('should create customer portal session', async () => {
      const { createCustomerPortalSession } = await import('@/lib/billing');

      vi.mocked(createCustomerPortalSession).mockResolvedValue({
        success: true,
        message: 'Portal session created',
        data: {
          url: 'https://billing.stripe.com/session/test_123',
        },
      });

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      const result = await caller.billing.createPortalSession();

      expect(result.url).toContain('billing.stripe.com');
      expect(createCustomerPortalSession).toHaveBeenCalledWith('user_123');
    });

    it('should throw error when portal session creation fails', async () => {
      const { createCustomerPortalSession } = await import('@/lib/billing');

      vi.mocked(createCustomerPortalSession).mockResolvedValue({
        success: false,
        message: 'No Stripe customer found',
      });

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      await expect(caller.billing.createPortalSession()).rejects.toThrow(
        'No Stripe customer found'
      );
    });
  });

  describe('sync', () => {
    it('should sync user subscription from Stripe', async () => {
      const { syncUserSubscriptionFromStripe } = await import('@/lib/billing/stripe-sync');

      vi.mocked(syncUserSubscriptionFromStripe).mockResolvedValue({
        success: true,
        message: 'Subscription synced successfully',
        subscription: {
          id: 'sub_stripe_123',
          object: 'subscription',
          status: 'active',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
          customer: 'cus_123',
          items: {
            object: 'list',
            data: [{ id: 'si_123', price: { id: 'price_123' } }],
            has_more: false,
            total_count: 1,
            url: '',
          },
          cancel_at_period_end: false,
          metadata: { userId: 'user_123', tier: 'pro' },
        } as unknown as Stripe.Subscription,
      });

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      const result = await caller.billing.sync({ action: 'user' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('synced');
      expect(result.action).toBe('user_sync');
      expect(result.subscription).toBeDefined();
      expect(syncUserSubscriptionFromStripe).toHaveBeenCalledWith('user_123');
    });

    it('should sync stale subscriptions', async () => {
      const { syncStaleSubscriptions } = await import('@/lib/billing/stripe-sync');

      vi.mocked(syncStaleSubscriptions).mockResolvedValue({
        syncedCount: 5,
        errors: [],
      });

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      const result = await caller.billing.sync({ action: 'stale' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('5 subscriptions');
      expect(result.action).toBe('stale_sync');
      expect(result.syncedCount).toBe(5);
      expect(syncStaleSubscriptions).toHaveBeenCalledWith(24);
    });

    it('should perform emergency sync', async () => {
      const { syncStaleSubscriptions } = await import('@/lib/billing/stripe-sync');

      vi.mocked(syncStaleSubscriptions).mockResolvedValue({
        syncedCount: 15,
        errors: [],
      });

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      const result = await caller.billing.sync({ action: 'emergency' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Emergency sync');
      expect(result.action).toBe('emergency_sync');
      expect(result.syncedCount).toBe(15);
      expect(syncStaleSubscriptions).toHaveBeenCalledWith(1);
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status information', async () => {
      const { getUserSubscription } = await import('@/lib/billing');

      const mockSubscriptionInfo: UserSubscriptionInfo = {
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date(),
        activeSubscription: {
          id: 'sub_123',
          userId: 'user_123',
          organizationId: null,
          subscriptionType: 'personal' as const,
          stripeSubscriptionId: 'sub_stripe_123',
          stripeCustomerId: 'cus_123',
          stripePriceId: 'price_123',
          status: 'active',
          tier: 'pro',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: 'false',
          scheduledDowngradeTier: null,
          canceledAt: null,
          createdAt: new Date(),
          updatedAt: new Date('2024-01-15'),
        },
      };

      vi.mocked(getUserSubscription).mockResolvedValue(mockSubscriptionInfo);

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      const result = await caller.billing.getSyncStatus();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Sync status retrieved');
      expect(result.user.id).toBe('user_123');
      expect(result.user.currentTier).toBe(SubscriptionTier.PRO);
      expect(result.availableActions).toHaveLength(3);
      expect(result.availableActions[0].action).toBe('user');
    });
  });

  describe('cancelDowngrade', () => {
    it('should cancel pending downgrade successfully', async () => {
      const { cancelPendingDowngrade } = await import('@/lib/billing');

      vi.mocked(cancelPendingDowngrade).mockResolvedValue({
        success: true,
        message: 'Pending downgrade has been canceled',
      });

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      const result = await caller.billing.cancelDowngrade();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Pending downgrade has been canceled');
      expect(cancelPendingDowngrade).toHaveBeenCalledWith('user_123');
    });

    it('should throw error when cancelPendingDowngrade fails', async () => {
      const { cancelPendingDowngrade } = await import('@/lib/billing');

      vi.mocked(cancelPendingDowngrade).mockResolvedValue({
        success: false,
        message: 'No pending downgrade found',
      });

      const caller = await createCaller(createMockTRPCContext({ userId: 'user_123' }));

      await expect(caller.billing.cancelDowngrade()).rejects.toThrow('No pending downgrade found');
    });
  });
});
