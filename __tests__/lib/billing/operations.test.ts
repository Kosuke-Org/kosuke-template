import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cancelOrgSubscription,
  cancelPendingDowngrade,
  createCheckoutSession,
  createCustomerPortalSession,
  reactivateOrgSubscription,
} from '@/lib/billing/operations';
import { getOrgSubscription } from '@/lib/billing/subscription';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/lib/db';
import { SubscriptionStatus, SubscriptionTier } from '@/lib/db/schema';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
      organizations: {
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
  getOrgSubscription: vi.fn(),
}));

vi.mock('@/lib/billing/eligibility', () => ({
  getSubscriptionEligibility: vi.fn(() => ({
    canCancel: true,
    canReactivate: true,
  })),
}));

describe('Billing Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('should handle invalid tier', async () => {
      vi.mocked(getOrgSubscription).mockResolvedValueOnce({
        tier: SubscriptionTier.FREE_MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: null,
        activeSubscription: null,
      });

      const result = await createCheckoutSession({
        tier: 'invalid' as any,
        organizationId: 'org_123',
        customerEmail: 'test@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid tier');
    });
  });

  describe('cancelOrgSubscription', () => {
    it('should cancel subscription', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      vi.mocked(getOrgSubscription).mockResolvedValueOnce({
        tier: SubscriptionTier.PRO_MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: futureDate,
        activeSubscription: {
          id: '1',
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
          organizationId: 'org_123',
          scheduledDowngradeTier: null,
        },
      });

      const result = await cancelOrgSubscription('org_123', 'sub_123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('canceled');
    });
  });

  describe('reactivateOrgSubscription', () => {
    it('should reactivate subscription', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      vi.mocked(getOrgSubscription).mockResolvedValueOnce({
        tier: SubscriptionTier.PRO_MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: futureDate,
        activeSubscription: {
          id: '1',
          stripeSubscriptionId: 'sub_123',
          tier: SubscriptionTier.PRO_MONTHLY,
          status: SubscriptionStatus.ACTIVE,
          createdAt: now,
          updatedAt: now,
          stripeCustomerId: 'cus_123',
          stripePriceId: 'price_123',
          currentPeriodStart: now,
          currentPeriodEnd: futureDate,
          cancelAtPeriodEnd: 'true',
          canceledAt: now,
          organizationId: 'org_123',
          scheduledDowngradeTier: null,
        },
      });

      const result = await reactivateOrgSubscription('org_123', 'sub_123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('reactivated');
    });
  });

  describe('createCustomerPortalSession', () => {
    it('should handle missing organization', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValueOnce(undefined);

      const result = await createCustomerPortalSession('org_123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Stripe customer');
    });

    it('should handle missing Stripe customer', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValueOnce({
        id: 'org_123',
        name: 'Test Org',
        slug: 'test-org',
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        logo: null,
      } as any);

      const result = await createCustomerPortalSession('org_123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Stripe customer');
    });
  });

  describe('cancelPendingDowngrade', () => {
    it('should handle no pending downgrade', async () => {
      const now = new Date();

      vi.mocked(getOrgSubscription).mockResolvedValueOnce({
        tier: SubscriptionTier.PRO_MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: now,
        activeSubscription: {
          id: '1',
          stripeSubscriptionId: 'sub_123',
          tier: SubscriptionTier.PRO_MONTHLY,
          status: SubscriptionStatus.ACTIVE,
          createdAt: now,
          updatedAt: now,
          stripeCustomerId: 'cus_123',
          stripePriceId: 'price_123',
          currentPeriodStart: now,
          currentPeriodEnd: now,
          cancelAtPeriodEnd: 'false',
          canceledAt: null,
          organizationId: 'org_123',
          scheduledDowngradeTier: null,
        },
      });

      const result = await cancelPendingDowngrade('user_123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No pending downgrade');
    });
  });
});
