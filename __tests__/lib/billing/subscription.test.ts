import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getUserSubscription,
  hasFeatureAccess,
  safeSubscriptionTierCast,
  safeSubscriptionStatusCast,
} from '@/lib/billing/subscription';
import { SubscriptionTier, SubscriptionStatus } from '@/lib/db/schema';

// Mock database
vi.mock('@/lib/db', () => ({
  db: {
    query: {
      userSubscriptions: {
        findFirst: vi.fn(),
      },
    },
  },
}));

import { db } from '@/lib/db';

describe('Subscription Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserSubscription', () => {
    it('should return free tier when no subscription exists', async () => {
      vi.mocked(db.query.userSubscriptions.findFirst).mockResolvedValueOnce(undefined);

      const result = await getUserSubscription('user_123');

      expect(result.tier).toBe(SubscriptionTier.FREE);
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(result.activeSubscription).toBeNull();
      expect(result.currentPeriodEnd).toBeNull();
    });

    it('should return paid tier for active subscription', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      vi.mocked(db.query.userSubscriptions.findFirst).mockResolvedValueOnce({
        id: '1',
        clerkUserId: 'user_123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        stripeSubscriptionId: 'sub_123',
        currentPeriodEnd: futureDate,
        cancelAtPeriodEnd: 'false',
        createdAt: now,
        updatedAt: now,
        stripeCustomerId: 'cus_123',
        stripePriceId: 'price_123',
        currentPeriodStart: now,
        canceledAt: null,
        organizationId: null,
        subscriptionType: 'personal',
        scheduledDowngradeTier: null,
      });

      const result = await getUserSubscription('user_123');

      expect(result.tier).toBe(SubscriptionTier.PRO);
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(result.activeSubscription).toBeDefined();
    });

    it('should return free tier when subscription is canceled', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 1000);

      vi.mocked(db.query.userSubscriptions.findFirst).mockResolvedValueOnce({
        id: '1',
        clerkUserId: 'user_123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.CANCELED,
        stripeSubscriptionId: 'sub_123',
        currentPeriodEnd: pastDate,
        cancelAtPeriodEnd: 'true',
        createdAt: now,
        updatedAt: now,
        stripeCustomerId: 'cus_123',
        stripePriceId: 'price_123',
        currentPeriodStart: now,
        canceledAt: now,
        organizationId: null,
        subscriptionType: 'personal',
        scheduledDowngradeTier: null,
      });

      const result = await getUserSubscription('user_123');

      expect(result.tier).toBe(SubscriptionTier.FREE);
    });

    it('should allow access during grace period after cancellation', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day in future

      vi.mocked(db.query.userSubscriptions.findFirst).mockResolvedValueOnce({
        id: '1',
        clerkUserId: 'user_123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        stripeSubscriptionId: 'sub_123',
        currentPeriodEnd: futureDate,
        cancelAtPeriodEnd: 'true', // Marked for cancellation but still in grace period
        createdAt: now,
        updatedAt: now,
        stripeCustomerId: 'cus_123',
        stripePriceId: 'price_123',
        currentPeriodStart: now,
        canceledAt: null,
        organizationId: null,
        subscriptionType: 'personal',
        scheduledDowngradeTier: null,
      });

      const result = await getUserSubscription('user_123');

      expect(result.tier).toBe(SubscriptionTier.PRO);
    });
  });

  describe('hasFeatureAccess', () => {
    it('should grant free tier access only to free features', () => {
      expect(hasFeatureAccess(SubscriptionTier.FREE, SubscriptionTier.FREE)).toBe(true);
      expect(hasFeatureAccess(SubscriptionTier.FREE, SubscriptionTier.PRO)).toBe(false);
      expect(hasFeatureAccess(SubscriptionTier.FREE, SubscriptionTier.BUSINESS)).toBe(false);
    });

    it('should grant pro tier access to free and pro features', () => {
      expect(hasFeatureAccess(SubscriptionTier.PRO, SubscriptionTier.FREE)).toBe(true);
      expect(hasFeatureAccess(SubscriptionTier.PRO, SubscriptionTier.PRO)).toBe(true);
      expect(hasFeatureAccess(SubscriptionTier.PRO, SubscriptionTier.BUSINESS)).toBe(false);
    });

    it('should grant business tier access to all features', () => {
      expect(hasFeatureAccess(SubscriptionTier.BUSINESS, SubscriptionTier.FREE)).toBe(true);
      expect(hasFeatureAccess(SubscriptionTier.BUSINESS, SubscriptionTier.PRO)).toBe(true);
      expect(hasFeatureAccess(SubscriptionTier.BUSINESS, SubscriptionTier.BUSINESS)).toBe(true);
    });
  });

  describe('safeSubscriptionTierCast', () => {
    it('should return valid tier unchanged', () => {
      expect(safeSubscriptionTierCast(SubscriptionTier.FREE)).toBe(SubscriptionTier.FREE);
      expect(safeSubscriptionTierCast(SubscriptionTier.PRO)).toBe(SubscriptionTier.PRO);
      expect(safeSubscriptionTierCast(SubscriptionTier.BUSINESS)).toBe(SubscriptionTier.BUSINESS);
    });

    it('should return fallback for invalid tier', () => {
      expect(safeSubscriptionTierCast('invalid')).toBe(SubscriptionTier.FREE);
      expect(safeSubscriptionTierCast('invalid', SubscriptionTier.PRO)).toBe(SubscriptionTier.PRO);
    });

    it('should use custom fallback if provided', () => {
      expect(safeSubscriptionTierCast('invalid', SubscriptionTier.BUSINESS)).toBe(
        SubscriptionTier.BUSINESS
      );
    });
  });

  describe('safeSubscriptionStatusCast', () => {
    it('should return valid status unchanged', () => {
      expect(safeSubscriptionStatusCast(SubscriptionStatus.ACTIVE)).toBe(SubscriptionStatus.ACTIVE);
      expect(safeSubscriptionStatusCast(SubscriptionStatus.CANCELED)).toBe(
        SubscriptionStatus.CANCELED
      );
    });

    it('should return null for invalid status when no fallback', () => {
      expect(safeSubscriptionStatusCast('invalid')).toBeNull();
    });

    it('should return fallback for invalid status', () => {
      expect(safeSubscriptionStatusCast('invalid', SubscriptionStatus.ACTIVE)).toBe(
        SubscriptionStatus.ACTIVE
      );
    });
  });
});
