import { vi } from 'vitest';
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Clerk auth
export const mockClerkUserType = {
  id: 'user_123',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
  firstName: 'John',
  lastName: 'Doe',
  fullName: 'John Doe',
  imageUrl: 'https://example.com/avatar.jpg',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export const mockClerkAuth = {
  userId: 'user_123',
  sessionId: 'session_123',
  user: mockClerkUserType,
};

// Mock Clerk webhook user
export const mockClerkWebhookUser = {
  id: 'user_123',
  email_addresses: [{ email_address: 'test@example.com' }],
  first_name: 'John',
  last_name: 'Doe',
  image_url: 'https://example.com/avatar.jpg',
  created_at: Date.now(),
  updated_at: Date.now(),
};

// Mock Stripe responses
export const mockStripeCheckoutSession = {
  id: 'cs_test_123',
  url: 'https://checkout.stripe.com/c/pay/cs_test_123',
  status: 'open',
  mode: 'subscription',
  customer: 'cus_123',
  metadata: { clerkUserId: 'user_123', tier: 'pro' },
};

export const mockStripeSubscription = {
  id: 'sub_123',
  status: 'active',
  current_period_start: Math.floor(Date.now() / 1000),
  current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
  customer: 'cus_123',
  items: {
    data: [{ price: { id: 'price_123' } }],
  },
  cancel_at_period_end: false,
  metadata: { clerkUserId: 'user_123', tier: 'pro' },
};

export const mockStripeWebhookEvent = {
  id: 'evt_123',
  type: 'customer.subscription.created',
  data: {
    object: mockStripeSubscription,
  },
};

// Setup mocks
export function setupMocks() {
  // Mock Clerk
  vi.mock('@clerk/nextjs/server', () => ({
    auth: vi.fn(() => Promise.resolve(mockClerkAuth)),
    clerkClient: {
      users: {
        getUser: vi.fn(() => Promise.resolve(mockClerkUserType)),
      },
    },
  }));

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

  // Mock file operations
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

export function resetMocks() {
  vi.clearAllMocks();
}

// Helper to mock fetch responses
export function mockFetchResponse(data: unknown, status = 200) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response);
}

// Helper to mock fetch error
export function mockFetchError(error: string) {
  (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error(error));
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
