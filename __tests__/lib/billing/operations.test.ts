import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createCheckoutSession,
  cancelUserSubscription,
  reactivateUserSubscription,
  createCustomerPortalSession,
  cancelPendingDowngrade,
} from '@/lib/billing/operations';
import { SubscriptionStatus, SubscriptionTier } from '@/lib/db/schema';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

vi.mock('@/lib/billing/client', () => ({
  stripe: {
    customers: {
      create: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    subscriptions: {
      update: vi.fn(),
    },
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
    subscriptionSchedules: {
      create: vi.fn(),
      list: vi.fn(),
      cancel: vi.fn(),
    },
  },
}));

vi.mock('@/lib/billing/subscription', () => ({
  getUserSubscription: vi.fn(),
}));

vi.mock('@/lib/billing/eligibility', () => ({
  getSubscriptionEligibility: vi.fn(() => ({
    canCancel: true,
    canReactivate: true,
  })),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/lib/db';
import { getUserSubscription } from '@/lib/billing/subscription';

describe('Billing Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('should handle invalid tier', async () => {
      vi.mocked(getUserSubscription).mockResolvedValueOnce({
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: null,
        activeSubscription: null,
      });

      const result = await createCheckoutSession({
        tier: 'invalid' as any,
        userId: 'user_123',
        customerEmail: 'test@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid tier');
    });
  });

  describe('cancelUserSubscription', () => {
    it('should cancel subscription', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      vi.mocked(getUserSubscription).mockResolvedValueOnce({
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: futureDate,
        activeSubscription: {
          id: '1',
          stripeSubscriptionId: 'sub_123',
          userId: 'user_123',
          tier: SubscriptionTier.PRO,
          status: SubscriptionStatus.ACTIVE,
          createdAt: now,
          updatedAt: now,
          stripeCustomerId: 'cus_123',
          stripePriceId: 'price_123',
          currentPeriodStart: now,
          currentPeriodEnd: futureDate,
          cancelAtPeriodEnd: 'false',
          canceledAt: null,
          organizationId: null,
          subscriptionType: 'personal',
          scheduledDowngradeTier: null,
        },
      });

      const result = await cancelUserSubscription('user_123', 'sub_123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('canceled');
    });
  });

  describe('reactivateUserSubscription', () => {
    it('should reactivate subscription', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      vi.mocked(getUserSubscription).mockResolvedValueOnce({
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: futureDate,
        activeSubscription: {
          id: '1',
          stripeSubscriptionId: 'sub_123',
          userId: 'user_123',
          tier: SubscriptionTier.PRO,
          status: SubscriptionStatus.ACTIVE,
          createdAt: now,
          updatedAt: now,
          stripeCustomerId: 'cus_123',
          stripePriceId: 'price_123',
          currentPeriodStart: now,
          currentPeriodEnd: futureDate,
          cancelAtPeriodEnd: 'true',
          canceledAt: now,
          organizationId: null,
          subscriptionType: 'personal',
          scheduledDowngradeTier: null,
        },
      });

      const result = await reactivateUserSubscription('user_123', 'sub_123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('reactivated');
    });
  });

  describe('createCustomerPortalSession', () => {
    it('should handle missing user', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(undefined);

      const result = await createCustomerPortalSession('user_123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Stripe customer');
    });

    it('should handle missing Stripe customer', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
        id: '1',
        userId: 'user_123',
        email: 'test@example.com',
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        image: null,
        name: 'Test User',
      } as any);

      const result = await createCustomerPortalSession('user_123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Stripe customer');
    });
  });

  describe('cancelPendingDowngrade', () => {
    it('should handle no pending downgrade', async () => {
      const now = new Date();

      vi.mocked(getUserSubscription).mockResolvedValueOnce({
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: now,
        activeSubscription: {
          id: '1',
          stripeSubscriptionId: 'sub_123',
          userId: 'user_123',
          tier: SubscriptionTier.PRO,
          status: SubscriptionStatus.ACTIVE,
          createdAt: now,
          updatedAt: now,
          stripeCustomerId: 'cus_123',
          stripePriceId: 'price_123',
          currentPeriodStart: now,
          currentPeriodEnd: now,
          cancelAtPeriodEnd: 'false',
          canceledAt: null,
          organizationId: null,
          subscriptionType: 'personal',
          scheduledDowngradeTier: null,
        },
      });

      const result = await cancelPendingDowngrade('user_123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No pending downgrade');
    });
  });
});
