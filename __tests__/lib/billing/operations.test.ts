import {
  createCheckoutSession,
  cancelSubscription,
  reactivateSubscription,
  upgradeSubscription,
} from '@/lib/billing/operations';
import {
  createTestUser,
  createTestSubscription,
  createApiSuccessResponse,
  createApiErrorResponse,
} from '../../setup/factories';
import { mockPolarCheckout, mockPolarSubscription, resetMocks } from '../../setup/mocks';
import { polar } from '@/lib/billing/client';

// Mock the billing client
jest.mock('@/lib/billing/client');
jest.mock('@/lib/billing/subscription');

const mockPolar = polar as jest.Mocked<typeof polar>;

describe('Billing Operations', () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session successfully', async () => {
      const checkoutData = {
        tier: 'pro' as const,
        userId: 'user_123',
        customerEmail: 'test@example.com',
        successUrl: 'https://example.com/success',
        metadata: { source: 'dashboard' },
      };

      mockPolar.checkouts.create.mockResolvedValue(mockPolarCheckout);

      const result = await createCheckoutSession(checkoutData);

      expect(result).toEqual({
        success: true,
        message: 'Checkout session created successfully',
        data: {
          url: mockPolarCheckout.url,
          id: mockPolarCheckout.id,
        },
      });

      expect(mockPolar.checkouts.create).toHaveBeenCalledWith({
        products: [expect.any(String)], // Product ID for pro tier
        successUrl: checkoutData.successUrl,
        customerEmail: checkoutData.customerEmail,
        metadata: {
          userId: checkoutData.userId,
          tier: checkoutData.tier,
          source: 'dashboard',
        },
      });
    });

    it('should handle invalid tier', async () => {
      const checkoutData = {
        tier: 'invalid_tier' as any,
        userId: 'user_123',
        customerEmail: 'test@example.com',
      };

      const result = await createCheckoutSession(checkoutData);

      expect(result).toEqual({
        success: false,
        message: 'Invalid tier: invalid_tier',
      });

      expect(mockPolar.checkouts.create).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const checkoutData = {
        tier: 'pro' as const,
        userId: 'user_123',
        customerEmail: 'test@example.com',
      };

      mockPolar.checkouts.create.mockRejectedValue(new Error('API Error'));

      const result = await createCheckoutSession(checkoutData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('checkout session');
    });

    it('should use default success URL when not provided', async () => {
      const checkoutData = {
        tier: 'premium' as const,
        userId: 'user_123',
        customerEmail: 'test@example.com',
      };

      mockPolar.checkouts.create.mockResolvedValue(mockPolarCheckout);

      await createCheckoutSession(checkoutData);

      expect(mockPolar.checkouts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          successUrl: expect.stringContaining('success'),
        })
      );
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription successfully', async () => {
      const cancelData = {
        subscriptionId: 'sub_123',
        userId: 'user_123',
        cancelAtPeriodEnd: true,
      };

      const canceledSubscription = {
        ...mockPolarSubscription,
        status: 'canceled',
      };

      mockPolar.subscriptions.cancel.mockResolvedValue(canceledSubscription);

      const result = await cancelSubscription(cancelData);

      expect(result.success).toBe(true);
      expect(result.message).toContain('canceled successfully');
      expect(mockPolar.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
    });

    it('should handle subscription not found', async () => {
      const cancelData = {
        subscriptionId: 'sub_nonexistent',
        userId: 'user_123',
        cancelAtPeriodEnd: true,
      };

      mockPolar.subscriptions.cancel.mockRejectedValue(new Error('Subscription not found'));

      const result = await cancelSubscription(cancelData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('cancel subscription');
    });

    it('should handle immediate cancellation', async () => {
      const cancelData = {
        subscriptionId: 'sub_123',
        userId: 'user_123',
        cancelAtPeriodEnd: false,
      };

      mockPolar.subscriptions.cancel.mockResolvedValue({
        ...mockPolarSubscription,
        status: 'canceled',
      });

      const result = await cancelSubscription(cancelData);

      expect(result.success).toBe(true);
      expect(mockPolar.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate subscription successfully', async () => {
      const reactivateData = {
        subscriptionId: 'sub_123',
        userId: 'user_123',
      };

      const reactivatedSubscription = {
        ...mockPolarSubscription,
        status: 'active',
      };

      mockPolar.subscriptions.reactivate.mockResolvedValue(reactivatedSubscription);

      const result = await reactivateSubscription(reactivateData);

      expect(result.success).toBe(true);
      expect(result.message).toContain('reactivated successfully');
      expect(mockPolar.subscriptions.reactivate).toHaveBeenCalledWith('sub_123');
    });

    it('should handle reactivation errors', async () => {
      const reactivateData = {
        subscriptionId: 'sub_123',
        userId: 'user_123',
      };

      mockPolar.subscriptions.reactivate.mockRejectedValue(
        new Error('Cannot reactivate subscription')
      );

      const result = await reactivateSubscription(reactivateData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('reactivate subscription');
    });
  });

  describe('upgradeSubscription', () => {
    it('should upgrade subscription successfully', async () => {
      const upgradeData = {
        currentSubscriptionId: 'sub_123',
        newTier: 'premium' as const,
        userId: 'user_123',
      };

      mockPolar.checkouts.create.mockResolvedValue(mockPolarCheckout);
      mockPolar.subscriptions.cancel.mockResolvedValue({
        ...mockPolarSubscription,
        status: 'canceled',
      });

      const result = await upgradeSubscription(upgradeData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('checkoutUrl');
      expect(mockPolar.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
      expect(mockPolar.checkouts.create).toHaveBeenCalled();
    });

    it('should handle same tier upgrade attempt', async () => {
      const upgradeData = {
        currentSubscriptionId: 'sub_123',
        newTier: 'pro' as const,
        userId: 'user_123',
        currentTier: 'pro' as const,
      };

      const result = await upgradeSubscription(upgradeData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('already subscribed');
    });

    it('should handle downgrade attempt', async () => {
      const upgradeData = {
        currentSubscriptionId: 'sub_123',
        newTier: 'pro' as const,
        userId: 'user_123',
        currentTier: 'premium' as const,
      };

      const result = await upgradeSubscription(upgradeData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('downgrade');
    });
  });
});
