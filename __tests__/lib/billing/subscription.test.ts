import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getOrgSubscription,
  hasFeatureAccess,
  safeSubscriptionStatusCast,
  safeSubscriptionTierCast,
} from '@/lib/billing';
import { db } from '@/lib/db';
import { SubscriptionStatus, SubscriptionTier } from '@/lib/db/schema';

// Mock database
vi.mock('@/lib/db', () => ({
  db: {
    query: {
      orgSubscriptions: {
        findFirst: vi.fn(),
      },
    },
  },
}));

describe('Subscription Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrgSubscription', () => {
    it('should return free tier when no subscription exists', async () => {
      vi.mocked(db.query.orgSubscriptions.findFirst).mockResolvedValueOnce(undefined);

      const result = await getOrgSubscription('user_123');

      expect(result.tier).toBe(SubscriptionTier.FREE_MONTHLY);
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(result.activeSubscription).toBeNull();
      expect(result.currentPeriodEnd).toBeNull();
    });

    it('should return paid tier for active subscription', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      vi.mocked(db.query.orgSubscriptions.findFirst).mockResolvedValueOnce({
        id: '1',
        tier: SubscriptionTier.PRO_MONTHLY,
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
        organizationId: 'org_123',
        scheduledDowngradeTier: null,
      });

      const result = await getOrgSubscription('org_123');

      expect(result.tier).toBe(SubscriptionTier.PRO_MONTHLY);
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(result.activeSubscription).toBeDefined();
    });

    it('should return free tier when subscription is canceled', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 1000);

      vi.mocked(db.query.orgSubscriptions.findFirst).mockResolvedValueOnce({
        id: '1',
        tier: SubscriptionTier.PRO_MONTHLY,
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
        organizationId: 'org_123',
        scheduledDowngradeTier: null,
      });

      const result = await getOrgSubscription('org_123');

      expect(result.tier).toBe(SubscriptionTier.FREE_MONTHLY);
    });

    it('should allow access during grace period after cancellation', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day in future

      vi.mocked(db.query.orgSubscriptions.findFirst).mockResolvedValueOnce({
        id: '1',
        tier: SubscriptionTier.PRO_MONTHLY,
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
        organizationId: 'org_123',
        scheduledDowngradeTier: null,
      });

      const result = await getOrgSubscription('org_123');

      expect(result.tier).toBe(SubscriptionTier.PRO_MONTHLY);
    });
  });

  describe('hasFeatureAccess', () => {
    it('should grant free tier access only to free features', () => {
      expect(hasFeatureAccess(SubscriptionTier.FREE_MONTHLY, SubscriptionTier.FREE_MONTHLY)).toBe(
        true
      );
      expect(hasFeatureAccess(SubscriptionTier.FREE_MONTHLY, SubscriptionTier.PRO_MONTHLY)).toBe(
        false
      );
      expect(
        hasFeatureAccess(SubscriptionTier.FREE_MONTHLY, SubscriptionTier.BUSINESS_MONTHLY)
      ).toBe(false);
    });

    it('should grant pro tier access to free and pro features', () => {
      expect(hasFeatureAccess(SubscriptionTier.PRO_MONTHLY, SubscriptionTier.FREE_MONTHLY)).toBe(
        true
      );
      expect(hasFeatureAccess(SubscriptionTier.PRO_MONTHLY, SubscriptionTier.PRO_MONTHLY)).toBe(
        true
      );
      expect(
        hasFeatureAccess(SubscriptionTier.PRO_MONTHLY, SubscriptionTier.BUSINESS_MONTHLY)
      ).toBe(false);
    });

    it('should grant business tier access to all features', () => {
      expect(
        hasFeatureAccess(SubscriptionTier.BUSINESS_MONTHLY, SubscriptionTier.FREE_MONTHLY)
      ).toBe(true);
      expect(
        hasFeatureAccess(SubscriptionTier.BUSINESS_MONTHLY, SubscriptionTier.PRO_MONTHLY)
      ).toBe(true);
      expect(
        hasFeatureAccess(SubscriptionTier.BUSINESS_MONTHLY, SubscriptionTier.BUSINESS_MONTHLY)
      ).toBe(true);
    });
  });

  describe('safeSubscriptionTierCast', () => {
    it('should return valid tier unchanged', () => {
      expect(safeSubscriptionTierCast(SubscriptionTier.FREE_MONTHLY)).toBe(
        SubscriptionTier.FREE_MONTHLY
      );
      expect(safeSubscriptionTierCast(SubscriptionTier.PRO_MONTHLY)).toBe(
        SubscriptionTier.PRO_MONTHLY
      );
      expect(safeSubscriptionTierCast(SubscriptionTier.BUSINESS_MONTHLY)).toBe(
        SubscriptionTier.BUSINESS_MONTHLY
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
