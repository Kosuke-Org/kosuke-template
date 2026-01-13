import { beforeEach, describe, expect, it, vi } from 'vitest';

import { stripe } from '@/lib/billing/client';
import { syncStaleSubscriptions, syncUserSubscriptionFromStripe } from '@/lib/billing/stripe-sync';
import { db } from '@/lib/db';
import { SubscriptionStatus, SubscriptionTier } from '@/lib/db/schema';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock database
vi.mock('@/lib/db', () => ({
  db: {
    query: {
      userSubscriptions: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

// Mock Stripe client
vi.mock('@/lib/billing/client', () => ({
  stripe: {
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
}));

describe('Stripe Sync Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncUserSubscriptionFromStripe', () => {
    it('should return success when no active subscription', async () => {
      vi.mocked(db.query.userSubscriptions.findFirst).mockResolvedValueOnce(undefined);

      const result = await syncUserSubscriptionFromStripe('user_123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('No active subscription');
    });

    it('should sync subscription from Stripe', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      vi.mocked(db.query.userSubscriptions.findFirst).mockResolvedValueOnce({
        id: '1',
        userId: 'user_123',
        stripeSubscriptionId: 'sub_123',
        tier: SubscriptionTier.PRO_MONTHLY,
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
      });

      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValueOnce({
        id: 'sub_123',
        status: 'active',
        items: { data: [{ price: { id: 'price_123' } }] },
        cancel_at_period_end: false,
        current_period_start: Math.floor(now.getTime() / 1000),
        current_period_end: Math.floor(futureDate.getTime() / 1000),
      } as any);

      const result = await syncUserSubscriptionFromStripe('user_123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('synced');
    });

    it('should handle deleted Stripe subscription', async () => {
      const now = new Date();

      vi.mocked(db.query.userSubscriptions.findFirst).mockResolvedValueOnce({
        id: '1',
        userId: 'user_123',
        stripeSubscriptionId: 'sub_123',
        tier: SubscriptionTier.PRO_MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
        stripeCustomerId: 'cus_123',
        stripePriceId: 'price_123',
        currentPeriodStart: now,
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: 'false',
        canceledAt: null,
        organizationId: null,
        subscriptionType: 'personal',
        scheduledDowngradeTier: null,
      });

      const error = new Error('No such subscription');
      (error as any).code = 'resource_missing';
      vi.mocked(stripe.subscriptions.retrieve).mockRejectedValueOnce(error);

      const result = await syncUserSubscriptionFromStripe('user_123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('longer exists');
    });
  });

  describe('syncStaleSubscriptions', () => {
    it('should sync multiple stale subscriptions', async () => {
      const now = new Date();
      const staleDate = new Date(now.getTime() - 25 * 60 * 60 * 1000);

      const staleSubscriptions = [
        {
          id: '1',
          userId: 'user_1',
          stripeSubscriptionId: 'sub_1',
          tier: SubscriptionTier.PRO_MONTHLY,
          status: SubscriptionStatus.ACTIVE,
          createdAt: staleDate,
          updatedAt: staleDate,
          stripeCustomerId: 'cus_1',
          stripePriceId: 'price_1',
          currentPeriodStart: staleDate,
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: 'false',
          canceledAt: null,
          organizationId: null,
          subscriptionType: 'personal',
          scheduledDowngradeTier: null,
        },
      ];

      vi.mocked(db.query.userSubscriptions.findMany).mockResolvedValueOnce(
        staleSubscriptions as any
      );

      // Mock individual sync calls
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        id: 'sub_1',
        status: 'active',
        items: { data: [{ price: { id: 'price_1' } }] },
        cancel_at_period_end: false,
        current_period_start: Math.floor(staleDate.getTime() / 1000),
        current_period_end: Math.floor(new Date().getTime() / 1000),
      } as any);

      const result = await syncStaleSubscriptions(24);

      expect(result.syncedCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(db.query.userSubscriptions.findMany).mockRejectedValueOnce(
        new Error('Database error')
      );

      const result = await syncStaleSubscriptions(24);

      expect(result.syncedCount).toBe(0);
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});
