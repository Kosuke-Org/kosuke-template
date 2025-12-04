import React, { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Stripe from 'stripe';
import { vi } from 'vitest';

import type { Session } from '@/lib/auth/providers';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock User authentication
type MockUserType = Session['user'];

const mockUser: MockUserType = {
  id: 'user_123',
  email: 'test@example.com',
  emailVerified: true,
  name: 'John Doe',
  image: 'https://example.com/avatar.jpg',
  createdAt: new Date(),
  updatedAt: new Date(),
  isAdmin: false,
};

// Mock Stripe responses
const mockStripeCheckoutSession = {
  id: 'cs_test_123',
  url: 'https://checkout.stripe.com/c/pay/cs_test_123',
  status: 'open',
  mode: 'subscription',
  customer: 'cus_123',
  metadata: { userId: 'user_123', tier: 'pro' },
};

const mockStripeSubscription = {
  id: 'sub_123',
  status: 'active',
  current_period_start: Math.floor(Date.now() / 1000),
  current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
  customer: 'cus_123',
  items: {
    data: [{ price: { id: 'price_123' } }],
  },
  cancel_at_period_end: false,
  metadata: { userId: 'user_123', tier: 'pro' },
};

const mockStripeWebhookEvent = {
  id: 'evt_123',
  type: 'customer.subscription.created',
  data: {
    object: mockStripeSubscription,
  },
};

export const mockedSession = {
  session: {
    id: 'session-1',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    token: 'test-token',
    createdAt: new Date(),
    updatedAt: new Date(),
    activeOrganizationId: '',
    activeOrganizationSlug: '',
  },
  user: {
    id: 'user-1',
    email: 'test@example.com',
    emailVerified: true,
    name: 'Test User',
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isAdmin: false,
  },
  updatedAt: Date.now(),
};

// Setup mocks
export function setupMocks() {
  // Mock Stripe client
  vi.mock('@/lib/billing/client', () => ({
    stripe: {
      checkout: {
        sessions: {
          create: vi.fn(() => Promise.resolve(mockStripeCheckoutSession)),
          retrieve: vi.fn(() => Promise.resolve(mockStripeCheckoutSession)),
        },
      },
      subscriptions: {
        retrieve: vi.fn(() => Promise.resolve(mockStripeSubscription)),
        update: vi.fn(() => Promise.resolve(mockStripeSubscription)),
        list: vi.fn(() => Promise.resolve({ data: [mockStripeSubscription] })),
      },
      customers: {
        create: vi.fn(() => Promise.resolve({ id: 'cus_123' })),
        retrieve: vi.fn(() => Promise.resolve({ id: 'cus_123' })),
      },
      billingPortal: {
        sessions: {
          create: vi.fn(() => Promise.resolve({ url: 'https://billing.stripe.com/session/123' })),
        },
      },
      webhooks: {
        constructEvent: vi.fn(() => mockStripeWebhookEvent),
      },
    },
  }));

  // Mock Next.js navigation
  vi.mock('next/navigation', () => ({
    redirect: vi.fn(),
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
    })),
    useSearchParams: vi.fn(() => new URLSearchParams()),
  }));

  // Mock fetch
  global.fetch = vi.fn() as typeof fetch;

  // Mock AWS S3 client
  vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn().mockImplementation(() => ({
      send: vi.fn(() => Promise.resolve({})),
    })),
    PutObjectCommand: vi.fn(),
    DeleteObjectCommand: vi.fn(),
  }));

  // Mock file operations (for backwards compatibility during tests)
  vi.mock('@vercel/blob', () => ({
    put: vi.fn(() => Promise.resolve({ url: 'https://blob.vercel-storage.com/file.jpg' })),
    del: vi.fn(() => Promise.resolve()),
  }));

  // Mock email service
  vi.mock('resend', () => ({
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi.fn(() => Promise.resolve({ id: 'email_123' })),
      },
    })),
  }));
}

// Stripe webhook event factories
export function createStripeSubscriptionEvent(
  type:
    | 'customer.subscription.created'
    | 'customer.subscription.updated'
    | 'customer.subscription.deleted',
  subscription: Partial<Stripe.Subscription> = {}
): Stripe.Event {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: `evt_${Math.random().toString(36).substr(2, 9)}`,
    object: 'event',
    api_version: '2023-10-16',
    created: now,
    type,
    data: {
      object: {
        id: 'sub_123',
        status: 'active',
        customer: 'cus_123',
        items: {
          data: [
            {
              id: 'si_123',
              price: { id: 'price_123' } as any,
              current_period_start: now,
              current_period_end: now + 2592000,
            } as any,
          ],
        } as any,
        cancel_at_period_end: false,
        metadata: { userId: 'user_123', tier: 'pro' },
        ...subscription,
      } as Stripe.Subscription,
      previous_attributes: {},
    },
    livemode: false,
    pending_webhooks: 1,
    request: null,
  } as Stripe.Event;
}

export function createStripeInvoiceEvent(
  type: 'invoice.paid' | 'invoice.payment_failed',
  invoice: any = {}
): Stripe.Event {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: `evt_${Math.random().toString(36).substr(2, 9)}`,
    object: 'event',
    api_version: '2023-10-16',
    created: now,
    type,
    data: {
      object: {
        id: `in_${Math.random().toString(36).substr(2, 9)}`,
        subscription: 'sub_123',
        period_start: now,
        period_end: now + 2592000,
        ...invoice,
      } as Stripe.Invoice,
      previous_attributes: {},
    },
    livemode: false,
    pending_webhooks: 1,
    request: null,
  } as Stripe.Event;
}

export function createStripeSubscriptionScheduleEvent(
  type: 'subscription_schedule.completed' | 'subscription_schedule.canceled',
  schedule: any = {}
): Stripe.Event {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: `evt_${Math.random().toString(36).substr(2, 9)}`,
    object: 'event',
    api_version: '2023-10-16',
    created: now,
    type,
    data: {
      object: {
        id: `sub_sched_${Math.random().toString(36).substr(2, 9)}`,
        subscription: 'sub_123',
        metadata: {
          userId: 'user_123',
          targetTier: 'pro',
          currentSubscriptionId: 'sub_123',
        },
        ...schedule,
      } as Stripe.SubscriptionSchedule,
      previous_attributes: {},
    },
    livemode: false,
    pending_webhooks: 1,
    request: null,
  } as Stripe.Event;
}

// TanStack Query test wrapper
export function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// Mock QueryClient for testing hooks that use useQueryClient
function _createMockQueryClient() {
  return {
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
    clear: vi.fn(),
    invalidateQueries: vi.fn(),
    refetchQueries: vi.fn(),
    cancelQueries: vi.fn(),
    removeQueries: vi.fn(),
    resetQueries: vi.fn(),
    isFetching: vi.fn(() => 0),
    isMutating: vi.fn(() => 0),
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    getQueryState: vi.fn(),
    setQueriesData: vi.fn(),
    setMutationDefaults: vi.fn(),
    getQueryDefaults: vi.fn(),
    setQueryDefaults: vi.fn(),
    getMutationDefaults: vi.fn(),
  };
}

// Helper to create tRPC test context matching createTRPCContext signature
export function createMockTRPCContext(options?: {
  userId?: string | null;
  activeOrganizationId?: string | null;
  activeOrganizationSlug?: string | null;
  getUser?: () => Promise<MockUserType | undefined>;
}) {
  const userId = options?.userId ?? null;

  return {
    userId,
    activeOrganizationId: options?.activeOrganizationId ?? null,
    orgRole: null, // TODO: Implement org role
    activeOrganizationSlug: options?.activeOrganizationSlug ?? null,
    async getUser() {
      return Promise.resolve(mockUser);
    },
    ...options,
  };
}
