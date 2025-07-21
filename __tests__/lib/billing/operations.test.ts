import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SubscriptionTier, SubscriptionStatus } from '@/lib/db/schema';
import { SubscriptionState } from '@/lib/types/billing';
import {
  createCheckoutSession,
  cancelUserSubscription,
  reactivateUserSubscription,
} from '@/lib/billing/operations';

// Mock dependencies
jest.mock('@/lib/billing/client', () => ({
  polar: {
    checkouts: {
      create: jest.fn(),
    },
    subscriptions: {
      revoke: jest.fn(),
      get: jest.fn(),
    },
  },
}));

jest.mock('@/lib/billing/config', () => ({
  PRODUCT_IDS: {
    [SubscriptionTier.PRO]: 'prod_pro_123',
    [SubscriptionTier.BUSINESS]: 'prod_business_123',
  },
  BILLING_URLS: {
    success: 'https://example.com/billing/success',
  },
}));

jest.mock('@/lib/billing/subscription', () => ({
  getUserSubscription: jest.fn(),
  updateUserSubscription: jest.fn(),
}));

jest.mock('@/lib/billing/eligibility', () => ({
  getSubscriptionEligibility: jest.fn(),
}));

import { polar } from '@/lib/billing/client';
import { getUserSubscription, updateUserSubscription } from '@/lib/billing/subscription';
import { getSubscriptionEligibility } from '@/lib/billing/eligibility';

const mockPolar = polar as jest.Mocked<typeof polar>;
const mockGetUserSubscription = getUserSubscription as jest.MockedFunction<
  typeof getUserSubscription
>;
const mockUpdateUserSubscription = updateUserSubscription as jest.MockedFunction<
  typeof updateUserSubscription
>;
const mockGetSubscriptionEligibility = getSubscriptionEligibility as jest.MockedFunction<
  typeof getSubscriptionEligibility
>;

describe('Billing Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session successfully', async () => {
      const mockCheckout = {
        id: 'checkout_123',
        url: 'https://polar.sh/checkout/123',
      };

      mockPolar.checkouts.create.mockResolvedValue(mockCheckout);

      const params = {
        tier: 'pro' as const,
        userId: 'user_123',
        customerEmail: 'test@example.com',
        successUrl: 'https://example.com/success',
        metadata: { source: 'dashboard' },
      };

      const result = await createCheckoutSession(params);

      expect(result).toEqual({
        success: true,
        message: 'Checkout session created successfully',
        data: {
          url: 'https://polar.sh/checkout/123',
          id: 'checkout_123',
        },
      });

      expect(mockPolar.checkouts.create).toHaveBeenCalledWith({
        products: ['prod_pro_123'],
        successUrl: 'https://example.com/success',
        customerEmail: 'test@example.com',
        metadata: {
          userId: 'user_123',
          tier: SubscriptionTier.PRO,
          source: 'dashboard',
        },
      });
    });

    it('should handle invalid tier', async () => {
      const params = {
        tier: 'invalid_tier' as SubscriptionTier,
        userId: 'user_123',
        customerEmail: 'test@example.com',
      };

      const result = await createCheckoutSession(params);

      expect(result).toEqual({
        success: false,
        message: 'Invalid tier: invalid_tier',
      });

      expect(mockPolar.checkouts.create).not.toHaveBeenCalled();
    });

    it('should handle Polar API error', async () => {
      mockPolar.checkouts.create.mockRejectedValue(new Error('Polar API error'));

      const params = {
        tier: SubscriptionTier.PRO,
        userId: 'user_123',
        customerEmail: 'test@example.com',
      };

      const result = await createCheckoutSession(params);

      expect(result).toEqual({
        success: false,
        message: 'Polar API error',
      });
    });

    it('should use default success URL when not provided', async () => {
      const mockCheckout = {
        id: 'checkout_123',
        url: 'https://polar.sh/checkout/123',
      };

      mockPolar.checkouts.create.mockResolvedValue(mockCheckout);

      const params = {
        tier: SubscriptionTier.PRO,
        userId: 'user_123',
        customerEmail: 'test@example.com',
      };

      await createCheckoutSession(params);

      expect(mockPolar.checkouts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          successUrl: 'https://example.com/billing/success',
        })
      );
    });
  });

  describe('cancelUserSubscription', () => {
    it('should cancel subscription successfully', async () => {
      const mockSubscription = {
        activeSubscription: {
          subscriptionId: 'sub_123',
          status: SubscriptionStatus.ACTIVE,
        },
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
      };

      const mockEligibility = {
        canCancel: true,
        canReactivate: false,
        canUpgrade: false,
        isInGracePeriod: false,
      };

      mockGetUserSubscription.mockResolvedValue(mockSubscription as any);
      mockGetSubscriptionEligibility.mockReturnValue(mockEligibility);
      mockPolar.subscriptions.revoke.mockResolvedValue({} as any);
      mockUpdateUserSubscription.mockResolvedValue();

      const result = await cancelUserSubscription('user_123', 'sub_123');

      expect(result).toEqual({
        success: true,
        message:
          'Subscription has been successfully canceled. You will continue to have access until the end of your current billing period.',
      });

      expect(mockPolar.subscriptions.revoke).toHaveBeenCalledWith({ id: 'sub_123' });
      expect(mockUpdateUserSubscription).toHaveBeenCalledWith('user_123', 'sub_123', {
        status: SubscriptionStatus.CANCELED,
        canceledAt: expect.any(Date),
      });
    });

    it('should handle ineligible cancellation', async () => {
      const mockSubscription = {
        activeSubscription: {
          subscriptionId: 'sub_123',
        },
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
      };

      const mockEligibility = {
        canCancel: false,
        canReactivate: false,
        canUpgrade: false,
        isInGracePeriod: false,
      };

      mockGetUserSubscription.mockResolvedValue(mockSubscription as any);
      mockGetSubscriptionEligibility.mockReturnValue(mockEligibility);

      const result = await cancelUserSubscription('user_123', 'sub_123');

      expect(result).toEqual({
        success: false,
        message: 'Subscription cannot be canceled at this time.',
      });

      expect(mockPolar.subscriptions.revoke).not.toHaveBeenCalled();
    });

    it('should handle subscription not found', async () => {
      const mockSubscription = {
        activeSubscription: null,
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
      };

      const mockEligibility = {
        canCancel: true,
        canReactivate: false,
        canUpgrade: false,
        isInGracePeriod: false,
      };

      mockGetUserSubscription.mockResolvedValue(mockSubscription as any);
      mockGetSubscriptionEligibility.mockReturnValue(mockEligibility);

      const result = await cancelUserSubscription('user_123', 'sub_123');

      expect(result).toEqual({
        success: false,
        message: 'Subscription not found or does not belong to this user.',
      });
    });

    it('should handle Polar API 404 error', async () => {
      const mockSubscription = {
        activeSubscription: {
          subscriptionId: 'sub_123',
        },
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
      };

      const mockEligibility = {
        canCancel: true,
        canReactivate: false,
        canUpgrade: false,
        isInGracePeriod: false,
      };

      mockGetUserSubscription.mockResolvedValue(mockSubscription as any);
      mockGetSubscriptionEligibility.mockReturnValue(mockEligibility);
      mockPolar.subscriptions.revoke.mockRejectedValue({ status: 404 });

      const result = await cancelUserSubscription('user_123', 'sub_123');

      expect(result).toEqual({
        success: false,
        message: 'Subscription not found in Polar. It may have already been canceled.',
      });
    });
  });

  describe('reactivateUserSubscription', () => {
    it('should reactivate subscription successfully', async () => {
      const mockSubscription = {
        activeSubscription: {
          subscriptionId: 'sub_123',
          status: SubscriptionStatus.CANCELED,
        },
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.CANCELED,
      };

      const mockEligibility = {
        canCancel: false,
        canReactivate: true,
        canUpgrade: false,
        isInGracePeriod: true,
      };

      mockGetUserSubscription.mockResolvedValue(mockSubscription as any);
      mockGetSubscriptionEligibility.mockReturnValue(mockEligibility);
      mockPolar.subscriptions.get.mockResolvedValue({} as any);
      mockUpdateUserSubscription.mockResolvedValue();

      const result = await reactivateUserSubscription('user_123', 'sub_123');

      expect(result).toEqual({
        success: true,
        message: 'Subscription has been successfully reactivated.',
      });

      expect(mockUpdateUserSubscription).toHaveBeenCalledWith('user_123', 'sub_123', {
        status: SubscriptionStatus.ACTIVE,
        canceledAt: null,
      });
    });

    it('should handle ineligible reactivation', async () => {
      const mockSubscription = {
        activeSubscription: {
          subscriptionId: 'sub_123',
        },
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
      };

      const mockEligibility = {
        canCancel: false,
        canReactivate: false,
        canUpgrade: false,
        isInGracePeriod: false,
      };

      mockGetUserSubscription.mockResolvedValue(mockSubscription as any);
      mockGetSubscriptionEligibility.mockReturnValue(mockEligibility);

      const result = await reactivateUserSubscription('user_123', 'sub_123');

      expect(result).toEqual({
        success: false,
        message: 'Subscription cannot be reactivated at this time.',
      });

      expect(mockPolar.subscriptions.get).not.toHaveBeenCalled();
    });

    it('should handle subscription not found', async () => {
      const mockSubscription = {
        activeSubscription: null,
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
      };

      const mockEligibility = {
        canCancel: false,
        canReactivate: true,
        canUpgrade: false,
        isInGracePeriod: false,
      };

      mockGetUserSubscription.mockResolvedValue(mockSubscription as any);
      mockGetSubscriptionEligibility.mockReturnValue(mockEligibility);

      const result = await reactivateUserSubscription('user_123', 'sub_123');

      expect(result).toEqual({
        success: false,
        message: 'Subscription not found or does not belong to this user.',
      });
    });

    it('should handle Polar API error during reactivation', async () => {
      const mockSubscription = {
        activeSubscription: {
          subscriptionId: 'sub_123',
        },
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.CANCELED,
      };

      const mockEligibility = {
        canCancel: false,
        canReactivate: true,
        canUpgrade: false,
        isInGracePeriod: true,
      };

      mockGetUserSubscription.mockResolvedValue(mockSubscription as any);
      mockGetSubscriptionEligibility.mockReturnValue(mockEligibility);
      mockPolar.subscriptions.get.mockRejectedValue({ status: 500, message: 'Server error' });

      const result = await reactivateUserSubscription('user_123', 'sub_123');

      expect(result).toEqual({
        success: false,
        message: 'Polar service is temporarily unavailable. Please try again later.',
      });
    });
  });
});
