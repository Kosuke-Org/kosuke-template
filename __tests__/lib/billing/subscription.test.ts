import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { db } from '@/lib/db';
import { userSubscriptions } from '@/lib/db/schema';
import { SubscriptionTier, SubscriptionStatus } from '@/lib/db/schema';
import {
  safeSubscriptionTierCast,
  safeSubscriptionStatusCast,
  createFreeSubscription,
  getUserSubscription,
  updateUserSubscription,
  hasFeatureAccess,
} from '@/lib/billing/subscription';

// Mock the database
jest.mock('@/lib/db', () => ({
  db: {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn(),
      }),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn(),
      }),
    }),
    query: {
      userSubscriptions: {
        findFirst: jest.fn(),
      },
    },
  },
}));

const mockDb = {
  insert: jest.fn().mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn(),
    }),
  }),
  update: jest.fn().mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn(),
    }),
  }),
  query: {
    userSubscriptions: {
      findFirst: jest.fn(),
    },
  },
};

describe('Subscription Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log
    console.warn = jest.fn(); // Mock console.warn
  });

  describe('safeSubscriptionTierCast', () => {
    it('should return valid subscription tier', () => {
      expect(safeSubscriptionTierCast('free')).toBe(SubscriptionTier.FREE);
      expect(safeSubscriptionTierCast('pro')).toBe(SubscriptionTier.PRO);
      expect(safeSubscriptionTierCast('business')).toBe(SubscriptionTier.BUSINESS);
    });

    it('should return fallback for invalid tier', () => {
      expect(safeSubscriptionTierCast('invalid')).toBe(SubscriptionTier.FREE);
      expect(safeSubscriptionTierCast('premium')).toBe(SubscriptionTier.FREE);
      expect(console.warn).toHaveBeenCalledWith(
        'Invalid subscription tier value: invalid. Falling back to free'
      );
    });

    it('should use custom fallback when provided', () => {
      expect(safeSubscriptionTierCast('invalid', SubscriptionTier.PRO)).toBe(SubscriptionTier.PRO);
    });
  });

  describe('safeSubscriptionStatusCast', () => {
    it('should return valid subscription status', () => {
      expect(safeSubscriptionStatusCast('active')).toBe(SubscriptionStatus.ACTIVE);
      expect(safeSubscriptionStatusCast('canceled')).toBe(SubscriptionStatus.CANCELED);
      expect(safeSubscriptionStatusCast('past_due')).toBe(SubscriptionStatus.PAST_DUE);
    });

    it('should return null fallback for invalid status', () => {
      expect(safeSubscriptionStatusCast('invalid')).toBe(null);
      expect(console.warn).toHaveBeenCalledWith(
        'Invalid subscription status value: invalid. Falling back to null'
      );
    });

    it('should use custom fallback when provided', () => {
      expect(safeSubscriptionStatusCast('invalid', SubscriptionStatus.ACTIVE)).toBe(
        SubscriptionStatus.ACTIVE
      );
    });
  });

  describe('createFreeSubscription', () => {
    it('should create a new free subscription', async () => {
      const mockSubscription = {
        id: 1,
        clerkUserId: 'user_123',
        subscriptionId: null,
        productId: null,
        status: SubscriptionStatus.ACTIVE,
        tier: SubscriptionTier.FREE,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockDb.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockSubscription]),
        }),
      });

      const result = await createFreeSubscription('user_123');

      expect(mockDb.insert).toHaveBeenCalledWith(userSubscriptions);
      expect(result).toEqual(mockSubscription);
    });
  });

  describe('getUserSubscription', () => {
    it('should return existing subscription', async () => {
      const mockSubscription = {
        id: 1,
        clerkUserId: 'user_123',
        subscriptionId: 'sub_123',
        productId: 'prod_123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        canceledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.query.userSubscriptions.findFirst.mockResolvedValue(mockSubscription);

      const result = await getUserSubscription('user_123');

      expect(result).toEqual({
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: mockSubscription.currentPeriodEnd,
        activeSubscription: mockSubscription,
      });
    });

    it('should create free subscription if none exists', async () => {
      mockDb.query.userSubscriptions.findFirst.mockResolvedValue(undefined);

      const mockFreeSubscription = {
        id: 1,
        clerkUserId: 'user_123',
        subscriptionId: null,
        productId: null,
        status: SubscriptionStatus.ACTIVE,
        tier: SubscriptionTier.FREE,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockDb.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockFreeSubscription]),
        }),
      });

      const result = await getUserSubscription('user_123');

      expect(result).toEqual({
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: null,
        activeSubscription: mockFreeSubscription,
      });
    });

    it('should handle canceled subscription in grace period', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const mockSubscription = {
        id: 1,
        clerkUserId: 'user_123',
        subscriptionId: 'sub_123',
        productId: 'prod_123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.CANCELED,
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
        canceledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.query.userSubscriptions.findFirst.mockResolvedValue(mockSubscription);

      const result = await getUserSubscription('user_123');

      expect(result).toEqual({
        tier: SubscriptionTier.PRO, // Should maintain access during grace period
        status: SubscriptionStatus.CANCELED,
        currentPeriodEnd: futureDate,
        activeSubscription: mockSubscription,
      });
    });

    it('should return free tier for expired canceled subscription', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mockSubscription = {
        id: 1,
        clerkUserId: 'user_123',
        subscriptionId: 'sub_123',
        productId: 'prod_123',
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.CANCELED,
        currentPeriodStart: new Date(),
        currentPeriodEnd: pastDate,
        canceledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.query.userSubscriptions.findFirst.mockResolvedValue(mockSubscription);

      const result = await getUserSubscription('user_123');

      expect(result).toEqual({
        tier: SubscriptionTier.FREE, // Should fallback to free after expiration
        status: SubscriptionStatus.CANCELED,
        currentPeriodEnd: pastDate,
        activeSubscription: mockSubscription,
      });
    });
  });

  describe('updateUserSubscription', () => {
    it('should update subscription with provided data', async () => {
      const updateData = {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
      };

      (mockDb.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      });

      await updateUserSubscription('user_123', 'sub_123', updateData);

      expect(mockDb.update).toHaveBeenCalledWith(userSubscriptions);
    });
  });

  describe('hasFeatureAccess', () => {
    it('should grant access when user tier meets requirement', () => {
      expect(hasFeatureAccess(SubscriptionTier.FREE, SubscriptionTier.FREE)).toBe(true);
      expect(hasFeatureAccess(SubscriptionTier.PRO, SubscriptionTier.FREE)).toBe(true);
      expect(hasFeatureAccess(SubscriptionTier.PRO, SubscriptionTier.PRO)).toBe(true);
      expect(hasFeatureAccess(SubscriptionTier.BUSINESS, SubscriptionTier.FREE)).toBe(true);
      expect(hasFeatureAccess(SubscriptionTier.BUSINESS, SubscriptionTier.PRO)).toBe(true);
      expect(hasFeatureAccess(SubscriptionTier.BUSINESS, SubscriptionTier.BUSINESS)).toBe(true);
    });

    it('should deny access when user tier is below requirement', () => {
      expect(hasFeatureAccess(SubscriptionTier.FREE, SubscriptionTier.PRO)).toBe(false);
      expect(hasFeatureAccess(SubscriptionTier.FREE, SubscriptionTier.BUSINESS)).toBe(false);
      expect(hasFeatureAccess(SubscriptionTier.PRO, SubscriptionTier.BUSINESS)).toBe(false);
    });

    it('should handle tier hierarchy correctly', () => {
      // Free tier (tier 0) can only access free features
      expect(hasFeatureAccess(SubscriptionTier.FREE, SubscriptionTier.FREE)).toBe(true);

      // Pro tier (tier 1) can access free and pro features
      expect(hasFeatureAccess(SubscriptionTier.PRO, SubscriptionTier.FREE)).toBe(true);
      expect(hasFeatureAccess(SubscriptionTier.PRO, SubscriptionTier.PRO)).toBe(true);

      // Business tier (tier 2) can access all features
      expect(hasFeatureAccess(SubscriptionTier.BUSINESS, SubscriptionTier.FREE)).toBe(true);
      expect(hasFeatureAccess(SubscriptionTier.BUSINESS, SubscriptionTier.PRO)).toBe(true);
      expect(hasFeatureAccess(SubscriptionTier.BUSINESS, SubscriptionTier.BUSINESS)).toBe(true);
    });
  });
});
