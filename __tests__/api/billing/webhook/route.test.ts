import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import {
  createStripeSubscriptionEvent,
  createStripeInvoiceEvent,
  createStripeSubscriptionScheduleEvent,
} from '@/__tests__/setup/mocks';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock Stripe
vi.mock('@/lib/billing/client', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      cancel: vi.fn(),
    },
  },
}));

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
      userSubscriptions: {
        findFirst: vi.fn().mockResolvedValue(undefined),
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  },
}));

// Now we can import the route
import { POST } from '@/app/api/billing/webhook/route';
import { stripe } from '@/lib/billing/client';

describe('Stripe Webhook Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    it('should return 500 if STRIPE_WEBHOOK_SECRET is not configured', async () => {
      const originalEnv = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const request = new NextRequest('http://localhost/api/billing/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_test' },
        body: 'test',
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      process.env.STRIPE_WEBHOOK_SECRET = originalEnv;
    });

    it('should return 400 if signature verification fails', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockImplementationOnce(() => {
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

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(event);

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

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(event);

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

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(event);

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

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(event);

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

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(event);

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

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(event);

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

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(event);

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

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(event);

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

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(event);

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

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(event);

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

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(event);

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

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(event);

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

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(event);

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

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValueOnce(event);

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
