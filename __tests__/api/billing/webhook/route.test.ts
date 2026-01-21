import { NextRequest } from 'next/server';

import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createStripeInvoiceEvent,
  createStripeSubscriptionEvent,
  createStripeSubscriptionScheduleEvent,
} from '@/__tests__/setup/mocks';

// Now we can import the route
import { POST } from '@/app/api/billing/webhook/route';

import { getStripe } from '@/lib/billing/client';
import { getConfigOrEnv } from '@/lib/services/config-service';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock config service
vi.mock('@/lib/services/config-service', () => ({
  CONFIG_KEYS: {
    STRIPE_WEBHOOK_SECRET: 'STRIPE_WEBHOOK_SECRET',
  },
  getConfigOrEnv: vi.fn(),
}));

// Mock Stripe client BEFORE route import to avoid hoisting issues
vi.mock('@/lib/billing/client', () => {
  const stripe = {
    webhooks: {
      constructEventAsync: vi.fn(),
    },
    subscriptions: {
      cancel: vi.fn(),
    },
  };
  return {
    getStripe: vi.fn().mockResolvedValue(stripe),
  };
});

// Mock database - just mock the db operations
vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    query: {
      orgSubscriptions: {
        findFirst: vi.fn().mockResolvedValue(undefined),
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  },
}));

const mockGetConfigOrEnv = vi.mocked(getConfigOrEnv);

// Get reference to mocked Stripe client
let stripe: any;

describe('Stripe Webhook Route', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetConfigOrEnv.mockResolvedValue('whsec_test_secret');
    // Get the mocked stripe client for each test
    stripe = await getStripe();
  });

  describe('POST /api/billing/webhook', () => {
    it('should return 400 if stripe-signature header is missing', async () => {
      const request = new NextRequest('http://localhost/api/billing/webhook', {
        method: 'POST',
        body: 'test',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Missing signature');
    });

    it('should return 500 if webhook secret is not configured in database', async () => {
      mockGetConfigOrEnv.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost/api/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_test' },
        body: 'test',
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe('Webhook secret not configured');

      expect(mockGetConfigOrEnv).toHaveBeenCalledWith('STRIPE_WEBHOOK_SECRET');
    });

    it('should return 400 if signature verification fails', async () => {
      vi.mocked(stripe.webhooks.constructEventAsync).mockImplementationOnce(() => {
        throw new Error('Signature verification failed');
      });

      const request = new NextRequest('http://localhost/api/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_invalid' },
        body: 'invalid_body',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid signature');
    });

    it('should return 200 for valid webhook with unhandled event type', async () => {
      const event = {
        id: 'evt_123',
        type: 'charge.succeeded',
        data: { object: {} },
      } as Stripe.Event;

      vi.mocked(stripe.webhooks.constructEventAsync).mockResolvedValueOnce(event);

      const request = new NextRequest('http://localhost/api/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_test' },
        body: JSON.stringify(event),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(true);
    });
  });

  describe('customer.subscription.created', () => {
    it('should call insert with correct subscription data', async () => {
      const now = Math.floor(Date.now() / 1000);
      const event = createStripeSubscriptionEvent('customer.subscription.created', {
        id: 'sub_new_123',
        customer: 'cus_123',
        status: 'active',
        items: {
          data: [
            {
              id: 'si_123',
              price: { id: 'price_pro_monthly' } as any,
              current_period_start: now,
              current_period_end: now + 2592000,
            } as any,
          ],
        } as any,
        metadata: { userId: 'user_123', tier: 'pro' },
        cancel_at_period_end: false,
      });

      vi.mocked(stripe.webhooks.constructEventAsync).mockResolvedValueOnce(event);

      const request = new NextRequest('http://localhost/api/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_test' },
        body: JSON.stringify(event),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should handle missing metadata gracefully', async () => {
      const now = Math.floor(Date.now() / 1000);
      const event = createStripeSubscriptionEvent('customer.subscription.created', {
        id: 'sub_no_meta_123',
        customer: 'cus_123',
        status: 'active',
        items: {
          data: [
            {
              id: 'si_123',
              price: { id: 'price_pro_monthly' } as any,
              current_period_start: now,
              current_period_end: now + 2592000,
            } as any,
          ],
        } as any,
        metadata: {},
      });

      vi.mocked(stripe.webhooks.constructEventAsync).mockResolvedValueOnce(event);

      const request = new NextRequest('http://localhost/api/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_test' },
        body: JSON.stringify(event),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should handle missing subscription items gracefully', async () => {
      const event = createStripeSubscriptionEvent('customer.subscription.created', {
        id: 'sub_no_items_123',
        customer: 'cus_123',
        items: { data: [] } as any,
        metadata: { userId: 'user_123', tier: 'pro' },
      });

      vi.mocked(stripe.webhooks.constructEventAsync).mockResolvedValueOnce(event);

      const request = new NextRequest('http://localhost/api/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_test' },
        body: JSON.stringify(event),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('customer.subscription.updated', () => {
    it('should handle subscription update events', async () => {
      const now = Math.floor(Date.now() / 1000);
      const event = createStripeSubscriptionEvent('customer.subscription.updated', {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'past_due',
        items: {
          data: [
            {
              id: 'si_123',
              price: { id: 'price_business_monthly' } as any,
              current_period_start: now,
              current_period_end: now + 2592000,
            } as any,
          ],
        } as any,
        cancel_at_period_end: true,
      });

      vi.mocked(stripe.webhooks.constructEventAsync).mockResolvedValueOnce(event);

      const request = new NextRequest('http://localhost/api/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_test' },
        body: JSON.stringify(event),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should handle missing subscription items', async () => {
      const event = createStripeSubscriptionEvent('customer.subscription.updated', {
        id: 'sub_123',
        items: { data: [] } as any,
      });

      vi.mocked(stripe.webhooks.constructEventAsync).mockResolvedValueOnce(event);

      const request = new NextRequest('http://localhost/api/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_test' },
        body: JSON.stringify(event),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('customer.subscription.deleted', () => {
    it('should handle subscription deletion events', async () => {
      const event = createStripeSubscriptionEvent('customer.subscription.deleted', {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'canceled',
      });

      vi.mocked(stripe.webhooks.constructEventAsync).mockResolvedValueOnce(event);

      const request = new NextRequest('http://localhost/api/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_test' },
        body: JSON.stringify(event),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('invoice.paid', () => {
    it('should handle paid invoice events', async () => {
      const event = createStripeInvoiceEvent('invoice.paid', {
        subscription: 'sub_123',
        period_start: Math.floor(Date.now() / 1000),
        period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
      });

      vi.mocked(stripe.webhooks.constructEventAsync).mockResolvedValueOnce(event);

      const request = new NextRequest('http://localhost/api/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_test' },
        body: JSON.stringify(event),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should handle invoice without subscription', async () => {
      const event = createStripeInvoiceEvent('invoice.paid', {
        subscription: null,
      });

      vi.mocked(stripe.webhooks.constructEventAsync).mockResolvedValueOnce(event);

      const request = new NextRequest('http://localhost/api/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_test' },
        body: JSON.stringify(event),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('invoice.payment_failed', () => {
    it('should handle payment failed events', async () => {
      const event = createStripeInvoiceEvent('invoice.payment_failed', {
        subscription: 'sub_123',
      });

      vi.mocked(stripe.webhooks.constructEventAsync).mockResolvedValueOnce(event);

      const request = new NextRequest('http://localhost/api/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_test' },
        body: JSON.stringify(event),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('subscription_schedule.completed', () => {
    it('should handle schedule completion events', async () => {
      const event = createStripeSubscriptionScheduleEvent('subscription_schedule.completed', {
        metadata: {
          userId: 'user_123',
          targetTier: 'pro',
        },
      });

      vi.mocked(stripe.webhooks.constructEventAsync).mockResolvedValueOnce(event);

      const request = new NextRequest('http://localhost/api/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_test' },
        body: JSON.stringify(event),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should handle missing metadata gracefully', async () => {
      const event = createStripeSubscriptionScheduleEvent('subscription_schedule.completed', {
        metadata: {},
      });

      vi.mocked(stripe.webhooks.constructEventAsync).mockResolvedValueOnce(event);

      const request = new NextRequest('http://localhost/api/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_test' },
        body: JSON.stringify(event),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('subscription_schedule.canceled', () => {
    it('should handle schedule cancellation events', async () => {
      const event = createStripeSubscriptionScheduleEvent('subscription_schedule.canceled', {
        metadata: {
          userId: 'user_123',
          currentSubscriptionId: 'sub_123',
        },
      });

      vi.mocked(stripe.webhooks.constructEventAsync).mockResolvedValueOnce(event);

      const request = new NextRequest('http://localhost/api/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_test' },
        body: JSON.stringify(event),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should handle missing metadata gracefully', async () => {
      const event = createStripeSubscriptionScheduleEvent('subscription_schedule.canceled', {
        metadata: {},
      });

      vi.mocked(stripe.webhooks.constructEventAsync).mockResolvedValueOnce(event);

      const request = new NextRequest('http://localhost/api/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_test' },
        body: JSON.stringify(event),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });
});
